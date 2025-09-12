import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Pool } from "pg";
import Redis from "ioredis";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { body, validationResult } from "express-validator";
import winston from "winston";
import { createProxyMiddleware } from "http-proxy-middleware";

import { DatabaseConnection } from "../database/connection";
import { UserRepository } from "../repositories/UserRepository";
import { AuthService } from "../services/AuthService";
import { EmailService } from "../services/EmailService";
import { CacheService } from "../services/CacheService";
import config from "../config/production.json";
import { logger } from "../utils/logger";
import { validateApiKey, validateUserRole } from "../middleware/auth";
import { errorHandler } from "../middleware/errorHandler";

/**
 * Node.js Express 백엔드 서버
 * - 다양한 npm 패키지 사용
 * - 미들웨어 체인
 * - 데이터베이스 연결
 * - 인증 및 보안
 */

interface User {
	id: number;
	username: string;
	email: string;
	password: string;
	role: "admin" | "user" | "moderator";
	createdAt: Date;
	updatedAt: Date;
}

interface AuthToken {
	userId: number;
	username: string;
	role: string;
	iat: number;
	exp: number;
}

interface ApiError {
	status: number;
	message: string;
	code?: string;
	details?: any;
}

class ApiServer {
	private app: express.Application;
	private db: Pool;
	private redis: Redis;
	private userRepo: UserRepository;
	private authService: AuthService;
	private emailService: EmailService;
	private cacheService: CacheService;

	constructor() {
		this.app = express();
		this.db = new Pool({
			connectionString: config.database.url,
			ssl: config.database.ssl,
		});
		this.redis = new Redis(config.redis.url);

		this.userRepo = new UserRepository(this.db);
		this.authService = new AuthService(config.jwt.secret);
		this.emailService = new EmailService(config.email);
		this.cacheService = new CacheService(this.redis);

		this.setupMiddleware();
		this.setupRoutes();
		this.setupErrorHandling();
	}

	private setupMiddleware(): void {
		// 보안 미들웨어
		this.app.use(
			helmet({
				contentSecurityPolicy: {
					directives: {
						defaultSrc: ["'self'"],
						scriptSrc: ["'self'", "'unsafe-inline'"],
						styleSrc: ["'self'", "'unsafe-inline'"],
						imgSrc: ["'self'", "data:", "https:"],
					},
				},
			}),
		);

		// CORS 설정
		this.app.use(
			cors({
				origin: config.cors.allowedOrigins,
				credentials: true,
				optionsSuccessStatus: 200,
			}),
		);

		// Rate limiting
		const limiter = rateLimit({
			windowMs: 15 * 60 * 1000, // 15분
			max: 100, // 최대 100 요청
			message: "Too many requests from this IP",
			standardHeaders: true,
			legacyHeaders: false,
		});
		this.app.use(limiter);

		// Body parsing
		this.app.use(express.json({ limit: "10mb" }));
		this.app.use(express.urlencoded({ extended: true }));

		// 로깅
		this.app.use((req: Request, res: Response, next: NextFunction) => {
			logger.info(`${req.method} ${req.path}`, {
				ip: req.ip,
				userAgent: req.get("User-Agent"),
				timestamp: new Date().toISOString(),
			});
			next();
		});

		// API 프록시 (개발 환경)
		if (config.environment === "development") {
			this.app.use(
				"/api/external",
				createProxyMiddleware({
					target: "https://external-api.example.com",
					changeOrigin: true,
					pathRewrite: {
						"^/api/external": "",
					},
				}),
			);
		}
	}

	private setupRoutes(): void {
		// Health check
		this.app.get("/health", async (req: Request, res: Response) => {
			try {
				await this.db.query("SELECT 1");
				await this.redis.ping();

				res.json({
					status: "healthy",
					timestamp: new Date().toISOString(),
					uptime: process.uptime(),
					services: {
						database: "connected",
						redis: "connected",
					},
				});
			} catch (error) {
				res.status(503).json({
					status: "unhealthy",
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		});

		// 인증 라우트
		this.app.post(
			"/auth/register",
			[
				body("username").isLength({ min: 3, max: 30 }).trim(),
				body("email").isEmail().normalizeEmail(),
				body("password")
					.isLength({ min: 8 })
					.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
			],
			async (req: Request, res: Response, next: NextFunction) => {
				try {
					const errors = validationResult(req);
					if (!errors.isEmpty()) {
						return res.status(400).json({
							error: "Validation failed",
							details: errors.array(),
						});
					}

					const { username, email, password } = req.body;

					// 사용자 중복 확인
					const existingUser = await this.userRepo.findByEmail(email);
					if (existingUser) {
						return res.status(409).json({
							error: "User already exists",
						});
					}

					// 비밀번호 해싱
					const saltRounds = 12;
					const hashedPassword = await bcrypt.hash(password, saltRounds);

					// 사용자 생성
					const newUser = await this.userRepo.create({
						username,
						email,
						password: hashedPassword,
						role: "user",
					});

					// 환영 이메일 발송
					await this.emailService.sendWelcomeEmail(email, username);

					// JWT 토큰 생성
					const token = this.authService.generateToken({
						userId: newUser.id,
						username: newUser.username,
						role: newUser.role,
					});

					res.status(201).json({
						message: "User created successfully",
						user: {
							id: newUser.id,
							username: newUser.username,
							email: newUser.email,
							role: newUser.role,
						},
						token,
					});
				} catch (error) {
					next(error);
				}
			},
		);

		// 로그인
		this.app.post(
			"/auth/login",
			[body("email").isEmail().normalizeEmail(), body("password").exists()],
			async (req: Request, res: Response, next: NextFunction) => {
				try {
					const errors = validationResult(req);
					if (!errors.isEmpty()) {
						return res.status(400).json({
							error: "Invalid credentials",
						});
					}

					const { email, password } = req.body;

					// 사용자 조회
					const user = await this.userRepo.findByEmail(email);
					if (!user) {
						return res.status(401).json({
							error: "Invalid credentials",
						});
					}

					// 비밀번호 확인
					const isValidPassword = await bcrypt.compare(password, user.password);
					if (!isValidPassword) {
						return res.status(401).json({
							error: "Invalid credentials",
						});
					}

					// JWT 토큰 생성
					const token = this.authService.generateToken({
						userId: user.id,
						username: user.username,
						role: user.role,
					});

					// 로그인 이력 캐싱
					await this.cacheService.setUserSession(user.id, {
						loginTime: new Date(),
						ipAddress: req.ip,
						userAgent: req.get("User-Agent"),
					});

					res.json({
						message: "Login successful",
						user: {
							id: user.id,
							username: user.username,
							email: user.email,
							role: user.role,
						},
						token,
					});
				} catch (error) {
					next(error);
				}
			},
		);

		// 보호된 라우트들
		this.app.use("/api", validateApiKey);

		// 사용자 목록 (관리자만)
		this.app.get(
			"/api/users",
			validateUserRole(["admin"]),
			async (req: Request, res: Response, next: NextFunction) => {
				try {
					const page = parseInt(req.query.page as string) || 1;
					const limit = parseInt(req.query.limit as string) || 10;
					const offset = (page - 1) * limit;

					const users = await this.userRepo.findAll({ limit, offset });
					const total = await this.userRepo.count();

					res.json({
						users: users.map((user) => ({
							id: user.id,
							username: user.username,
							email: user.email,
							role: user.role,
							createdAt: user.createdAt,
						})),
						pagination: {
							page,
							limit,
							total,
							totalPages: Math.ceil(total / limit),
						},
					});
				} catch (error) {
					next(error);
				}
			},
		);

		// 사용자 프로필
		this.app.get(
			"/api/profile",
			validateApiKey,
			async (req: Request, res: Response, next: NextFunction) => {
				try {
					const userId = (req as any).user.userId;
					const user = await this.userRepo.findById(userId);

					if (!user) {
						return res.status(404).json({
							error: "User not found",
						});
					}

					res.json({
						id: user.id,
						username: user.username,
						email: user.email,
						role: user.role,
						createdAt: user.createdAt,
						updatedAt: user.updatedAt,
					});
				} catch (error) {
					next(error);
				}
			},
		);
	}

	private setupErrorHandling(): void {
		// 404 핸들러
		this.app.use("*", (req: Request, res: Response) => {
			res.status(404).json({
				error: "Route not found",
				path: req.originalUrl,
				method: req.method,
			});
		});

		// 글로벌 에러 핸들러
		this.app.use(errorHandler);

		// 프로세스 에러 핸들링
		process.on("unhandledRejection", (reason, promise) => {
			logger.error("Unhandled Rejection at:", promise, "reason:", reason);
		});

		process.on("uncaughtException", (error) => {
			logger.error("Uncaught Exception:", error);
			process.exit(1);
		});
	}

	public async start(port: number = 3000): Promise<void> {
		try {
			// 데이터베이스 연결 확인
			await this.db.query("SELECT NOW()");
			logger.info("Database connected successfully");

			// Redis 연결 확인
			await this.redis.ping();
			logger.info("Redis connected successfully");

			// 서버 시작
			this.app.listen(port, () => {
				logger.info(`Server running on port ${port}`);
				logger.info(`Environment: ${config.environment}`);
			});
		} catch (error) {
			logger.error("Failed to start server:", error);
			process.exit(1);
		}
	}

	public async stop(): Promise<void> {
		await this.db.end();
		await this.redis.quit();
		logger.info("Server stopped gracefully");
	}
}

// 서버 인스턴스 생성 및 시작
const server = new ApiServer();

if (require.main === module) {
	const port = parseInt(process.env.PORT || "3000", 10);
	server.start(port);
}

export default server;
export { ApiServer };
export type { User, AuthToken, ApiError };

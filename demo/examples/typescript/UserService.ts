/**
 * User Service
 *
 * @semantic-tags: service-layer, auth-domain, public-api
 * @description: 사용자 인증 및 관리 서비스
 */

import { User } from "./types/User";
import { UserRepository } from "./repositories/UserRepository";
import { AuthService } from "./services/AuthService";
import { Logger } from "./utils/Logger";

/**
 * 사용자 서비스 클래스
 *
 * @semantic-tags: service-class, auth-domain, public-api
 */
export class UserService {
	private userRepository: UserRepository;
	private authService: AuthService;
	private logger: Logger;

	constructor(
		userRepository: UserRepository,
		authService: AuthService,
		logger: Logger,
	) {
		this.userRepository = userRepository;
		this.authService = authService;
		this.logger = logger;
	}

	/**
	 * 사용자 인증
	 *
	 * @semantic-tags: auth-method, public-api
	 * @param email 사용자 이메일
	 * @param password 사용자 비밀번호
	 * @returns 인증된 사용자 정보
	 */
	async authenticateUser(
		email: string,
		password: string,
	): Promise<User | null> {
		try {
			this.logger.info(`Authenticating user: ${email}`);

			const user = await this.userRepository.findByEmail(email);
			if (!user) {
				this.logger.warn(`User not found: ${email}`);
				return null;
			}

			const isValidPassword = await this.authService.validatePassword(
				password,
				user.passwordHash,
			);
			if (!isValidPassword) {
				this.logger.warn(`Invalid password for user: ${email}`);
				return null;
			}

			this.logger.info(`User authenticated successfully: ${email}`);
			return user;
		} catch (error) {
			this.logger.error(`Authentication failed for user: ${email}`, error);
			throw error;
		}
	}

	/**
	 * 사용자 생성
	 *
	 * @semantic-tags: create-method, public-api
	 * @param userData 사용자 데이터
	 * @returns 생성된 사용자 정보
	 */
	async createUser(userData: Partial<User>): Promise<User> {
		try {
			this.logger.info("Creating new user");

			const hashedPassword = await this.authService.hashPassword(
				userData.password!,
			);
			const user = {
				...userData,
				passwordHash: hashedPassword,
				createdAt: new Date(),
				updatedAt: new Date(),
			} as User;

			const createdUser = await this.userRepository.create(user);
			this.logger.info(`User created successfully: ${createdUser.id}`);

			return createdUser;
		} catch (error) {
			this.logger.error("Failed to create user", error);
			throw error;
		}
	}

	/**
	 * 사용자 정보 업데이트
	 *
	 * @semantic-tags: update-method, public-api
	 * @param userId 사용자 ID
	 * @param updateData 업데이트할 데이터
	 * @returns 업데이트된 사용자 정보
	 */
	async updateUser(
		userId: string,
		updateData: Partial<User>,
	): Promise<User | null> {
		try {
			this.logger.info(`Updating user: ${userId}`);

			const user = await this.userRepository.findById(userId);
			if (!user) {
				this.logger.warn(`User not found: ${userId}`);
				return null;
			}

			const updatedUser = await this.userRepository.update(userId, {
				...updateData,
				updatedAt: new Date(),
			});

			this.logger.info(`User updated successfully: ${userId}`);
			return updatedUser;
		} catch (error) {
			this.logger.error(`Failed to update user: ${userId}`, error);
			throw error;
		}
	}

	/**
	 * 사용자 삭제
	 *
	 * @semantic-tags: delete-method, public-api
	 * @param userId 사용자 ID
	 * @returns 삭제 성공 여부
	 */
	async deleteUser(userId: string): Promise<boolean> {
		try {
			this.logger.info(`Deleting user: ${userId}`);

			const user = await this.userRepository.findById(userId);
			if (!user) {
				this.logger.warn(`User not found: ${userId}`);
				return false;
			}

			await this.userRepository.delete(userId);
			this.logger.info(`User deleted successfully: ${userId}`);

			return true;
		} catch (error) {
			this.logger.error(`Failed to delete user: ${userId}`, error);
			throw error;
		}
	}

	/**
	 * 사용자 목록 조회
	 *
	 * @semantic-tags: read-method, public-api
	 * @param filters 필터 조건
	 * @returns 사용자 목록
	 */
	async getUsers(filters?: Partial<User>): Promise<User[]> {
		try {
			this.logger.info("Fetching users");

			const users = await this.userRepository.findAll(filters);
			this.logger.info(`Found ${users.length} users`);

			return users;
		} catch (error) {
			this.logger.error("Failed to fetch users", error);
			throw error;
		}
	}
}

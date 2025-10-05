/**
 * External Link Validator
 * 외부 링크의 접근성과 상태를 검증하는 시스템
 */

import * as https from "https";
import * as http from "http";
import { URL } from "url";

export interface LinkValidationResult {
	url: string;
	status: "unknown" | "accessible" | "broken" | "redirected" | "timeout";
	statusCode?: number;
	responseTime?: number;
	lastChecked: Date;
	error?: string;
	redirectUrl?: string;
}

export interface LinkValidationOptions {
	timeout?: number; // milliseconds
	maxRedirects?: number;
	userAgent?: string;
	concurrent?: number; // 동시 검증 수
	cache?: boolean; // 캐시 사용 여부
}

export class ExternalLinkValidator {
	private cache = new Map<string, LinkValidationResult>();
	private validationQueue = new Set<string>();
	private options: Required<LinkValidationOptions>;

	constructor(options: LinkValidationOptions = {}) {
		this.options = {
			timeout: options.timeout || 5000,
			maxRedirects: options.maxRedirects || 5,
			userAgent: options.userAgent || "Dependency-Linker/1.0",
			concurrent: options.concurrent || 10,
			cache: options.cache !== false,
		};
	}

	/**
	 * 단일 링크 검증
	 */
	async validateLink(url: string): Promise<LinkValidationResult> {
		// 캐시 확인
		if (this.options.cache && this.cache.has(url)) {
			const cached = this.cache.get(url)!;
			// 24시간 이내 캐시된 결과는 재사용
			if (Date.now() - cached.lastChecked.getTime() < 24 * 60 * 60 * 1000) {
				return cached;
			}
		}

		// 이미 검증 중인 URL은 대기
		if (this.validationQueue.has(url)) {
			return {
				url,
				status: "unknown",
				lastChecked: new Date(),
				error: "Validation in progress",
			};
		}

		this.validationQueue.add(url);

		try {
			const result = await this.performValidation(url);

			// 캐시에 저장
			if (this.options.cache) {
				this.cache.set(url, result);
			}

			return result;
		} finally {
			this.validationQueue.delete(url);
		}
	}

	/**
	 * 여러 링크 동시 검증
	 */
	async validateLinks(urls: string[]): Promise<LinkValidationResult[]> {
		const results: LinkValidationResult[] = [];
		const chunks = this.chunkArray(urls, this.options.concurrent);

		for (const chunk of chunks) {
			const chunkResults = await Promise.all(
				chunk.map((url) => this.validateLink(url)),
			);
			results.push(...chunkResults);
		}

		return results;
	}

	/**
	 * 실제 링크 검증 수행
	 */
	private async performValidation(url: string): Promise<LinkValidationResult> {
		const startTime = Date.now();

		try {
			const parsedUrl = new URL(url);
			const isHttps = parsedUrl.protocol === "https:";
			const client = isHttps ? https : http;

			return new Promise((resolve) => {
				const request = client.request(url, {
					method: "HEAD", // HEAD 요청으로 빠른 검증
					timeout: this.options.timeout,
					headers: {
						"User-Agent": this.options.userAgent,
					},
				});

				const timeout = setTimeout(() => {
					request.destroy();
					resolve({
						url,
						status: "timeout",
						responseTime: Date.now() - startTime,
						lastChecked: new Date(),
						error: "Request timeout",
					});
				}, this.options.timeout);

				request.on("response", (response) => {
					clearTimeout(timeout);

					const responseTime = Date.now() - startTime;
					const statusCode = response.statusCode!;

					// 리다이렉트 처리
					if (statusCode >= 300 && statusCode < 400) {
						const redirectUrl = response.headers.location;
						if (redirectUrl) {
							resolve({
								url,
								status: "redirected",
								statusCode,
								responseTime,
								lastChecked: new Date(),
								redirectUrl,
							});
						} else {
							resolve({
								url,
								status: "broken",
								statusCode,
								responseTime,
								lastChecked: new Date(),
								error: "Redirect without location header",
							});
						}
					} else if (statusCode >= 200 && statusCode < 300) {
						resolve({
							url,
							status: "accessible",
							statusCode,
							responseTime,
							lastChecked: new Date(),
						});
					} else {
						resolve({
							url,
							status: "broken",
							statusCode,
							responseTime,
							lastChecked: new Date(),
							error: `HTTP ${statusCode}`,
						});
					}
				});

				request.on("error", (error) => {
					clearTimeout(timeout);
					resolve({
						url,
						status: "broken",
						responseTime: Date.now() - startTime,
						lastChecked: new Date(),
						error: error.message,
					});
				});

				request.end();
			});
		} catch (error) {
			return {
				url,
				status: "broken",
				responseTime: Date.now() - startTime,
				lastChecked: new Date(),
				error: error instanceof Error ? error.message : "Invalid URL",
			};
		}
	}

	/**
	 * 배열을 청크로 분할
	 */
	private chunkArray<T>(array: T[], chunkSize: number): T[][] {
		const chunks: T[][] = [];
		for (let i = 0; i < array.length; i += chunkSize) {
			chunks.push(array.slice(i, i + chunkSize));
		}
		return chunks;
	}

	/**
	 * 캐시 클리어
	 */
	clearCache(): void {
		this.cache.clear();
	}

	/**
	 * 캐시 통계
	 */
	getCacheStats(): {
		totalCached: number;
		accessible: number;
		broken: number;
		redirected: number;
		timeout: number;
	} {
		const stats = {
			totalCached: this.cache.size,
			accessible: 0,
			broken: 0,
			redirected: 0,
			timeout: 0,
		};

		for (const result of Array.from(this.cache.values())) {
			switch (result.status) {
				case "accessible":
					stats.accessible++;
					break;
				case "broken":
					stats.broken++;
					break;
				case "redirected":
					stats.redirected++;
					break;
				case "timeout":
					stats.timeout++;
					break;
			}
		}

		return stats;
	}
}

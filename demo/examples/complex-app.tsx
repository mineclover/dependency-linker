import React, { useState, useEffect, useCallback } from "react";
import { Button, TextField, Card, Typography, Box } from "@mui/material";
import axios from "axios";
import { debounce } from "lodash";
import { format, parseISO } from "date-fns";
import { toast } from "react-toastify";
import "./styles.css";
import { ApiClient } from "../services/ApiClient";
import { UserService } from "../services/UserService";
import { validateEmail, formatName } from "./utils/validators";
import config from "../config/app.config.json";

/**
 * 복잡한 React 컴포넌트 예제
 * - 다양한 외부 라이브러리 사용
 * - 상대 경로 import
 * - 타입스크립트 인터페이스
 * - 다중 export
 */

export interface User {
	id: number;
	name: string;
	email: string;
	createdAt: string;
}

export interface AppProps {
	initialUsers?: User[];
	theme?: "light" | "dark";
	onUserSelect?: (user: User) => void;
}

interface ApiResponse<T> {
	data: T;
	status: number;
	message: string;
}

const ComplexApp: React.FC<AppProps> = ({
	initialUsers = [],
	theme = "light",
	onUserSelect,
}) => {
	const [users, setUsers] = useState<User[]>(initialUsers);
	const [loading, setLoading] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedUser, setSelectedUser] = useState<User | null>(null);
	const [error, setError] = useState<string | null>(null);

	const apiClient = new ApiClient(config.apiUrl);
	const userService = new UserService(apiClient);

	// 디바운스된 검색
	const debouncedSearch = useCallback(
		debounce(async (term: string) => {
			if (!term.trim()) return;

			setLoading(true);
			setError(null);

			try {
				const response: ApiResponse<User[]> = await axios.get(
					`/api/users/search?q=${encodeURIComponent(term)}`,
				);
				setUsers(response.data);
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Search failed";
				setError(errorMessage);
				toast.error(`검색 실패: ${errorMessage}`);
			} finally {
				setLoading(false);
			}
		}, 300),
		[],
	);

	useEffect(() => {
		const fetchUsers = async () => {
			if (initialUsers.length > 0) return;

			setLoading(true);
			try {
				const fetchedUsers = await userService.getAllUsers();
				setUsers(fetchedUsers);
			} catch (err) {
				setError("Failed to load users");
				toast.error("사용자 목록을 불러오지 못했습니다.");
			} finally {
				setLoading(false);
			}
		};

		fetchUsers();
	}, [initialUsers.length]);

	useEffect(() => {
		if (searchTerm) {
			debouncedSearch(searchTerm);
		}
	}, [searchTerm, debouncedSearch]);

	const handleUserClick = useCallback(
		(user: User) => {
			setSelectedUser(user);
			onUserSelect?.(user);

			// 분석 이벤트 전송
			if (window.gtag) {
				window.gtag("event", "user_select", {
					user_id: user.id,
					user_name: user.name,
				});
			}
		},
		[onUserSelect],
	);

	const handleEmailValidation = (email: string): boolean => {
		return validateEmail(email);
	};

	const formatUserName = (user: User): string => {
		return formatName(user.name);
	};

	const formatCreatedDate = (dateString: string): string => {
		try {
			const date = parseISO(dateString);
			return format(date, "yyyy-MM-dd HH:mm");
		} catch {
			return "Invalid date";
		}
	};

	const filteredUsers = users.filter(
		(user) =>
			user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.email.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	if (error && users.length === 0) {
		return (
			<Card className={`error-container ${theme}`}>
				<Typography variant="h6" color="error">
					오류가 발생했습니다
				</Typography>
				<Typography variant="body2">{error}</Typography>
			</Card>
		);
	}

	return (
		<Box className={`app-container ${theme}`}>
			<Card elevation={3}>
				<Box p={3}>
					<Typography variant="h4" gutterBottom>
						사용자 관리 시스템
					</Typography>

					<TextField
						fullWidth
						variant="outlined"
						placeholder="사용자 이름 또는 이메일로 검색..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						disabled={loading}
						sx={{ mb: 2 }}
					/>

					{loading && (
						<Typography variant="body2" color="textSecondary">
							로딩 중...
						</Typography>
					)}

					<Box className="user-list">
						{filteredUsers.map((user) => (
							<Card
								key={user.id}
								variant="outlined"
								className={`user-card ${selectedUser?.id === user.id ? "selected" : ""}`}
								onClick={() => handleUserClick(user)}
								sx={{ mb: 1, cursor: "pointer" }}
							>
								<Box p={2}>
									<Typography variant="h6">{formatUserName(user)}</Typography>
									<Typography
										variant="body2"
										color={
											handleEmailValidation(user.email)
												? "textSecondary"
												: "error"
										}
									>
										{user.email}
									</Typography>
									<Typography variant="caption" color="textSecondary">
										가입일: {formatCreatedDate(user.createdAt)}
									</Typography>
								</Box>
							</Card>
						))}
					</Box>

					{filteredUsers.length === 0 && !loading && (
						<Typography variant="body2" color="textSecondary" align="center">
							검색 결과가 없습니다.
						</Typography>
					)}

					{selectedUser && (
						<Box mt={2}>
							<Button
								variant="contained"
								color="primary"
								onClick={() => setSelectedUser(null)}
							>
								선택 해제
							</Button>
						</Box>
					)}
				</Box>
			</Card>
		</Box>
	);
};

// 유틸리티 함수들 export
export const userUtils = {
	validateUser: (user: Partial<User>): boolean => {
		return !!(user.name && user.email && validateEmail(user.email));
	},

	sortUsersByName: (users: User[]): User[] => {
		return [...users].sort((a, b) => a.name.localeCompare(b.name));
	},

	filterActiveUsers: (users: User[]): User[] => {
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		return users.filter((user) => {
			try {
				const createdDate = parseISO(user.createdAt);
				return createdDate > thirtyDaysAgo;
			} catch {
				return false;
			}
		});
	},
};

// 타입 export
export type { ApiResponse };

export default ComplexApp;

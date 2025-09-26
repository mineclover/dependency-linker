import React, { useState, useEffect } from "react";
import { Button } from "./Button";
import { Modal } from "../components/Modal";
import * as utils from "../utils/helpers";
import axios from "axios";

interface UserProps {
	id: number;
	name: string;
	email?: string;
}

interface ComponentState {
	users: UserProps[];
	loading: boolean;
	error?: string;
}

/**
 * A simple React component that demonstrates various TypeScript patterns
 */
export const UserComponent: React.FC = () => {
	const [state, setState] = useState<ComponentState>({
		users: [],
		loading: false,
	});

	const [selectedUser, setSelectedUser] = useState<UserProps | null>(null);

	useEffect(() => {
		fetchUsers();
	}, []);

	const fetchUsers = async (): Promise<void> => {
		setState((prev) => ({ ...prev, loading: true }));

		try {
			const response = await axios.get<UserProps[]>("/api/users");
			setState((prev) => ({
				...prev,
				users: response.data,
				loading: false,
			}));
		} catch (error) {
			setState((prev) => ({
				...prev,
				error: "Failed to fetch users",
				loading: false,
			}));
		}
	};

	const handleUserSelect = (user: UserProps): void => {
		setSelectedUser(user);
	};

	const handleCloseModal = (): void => {
		setSelectedUser(null);
	};

	const formatUserName = (user: UserProps): string => {
		return utils.capitalize(user.name);
	};

	if (state.loading) {
		return <div>Loading...</div>;
	}

	if (state.error) {
		return <div>Error: {state.error}</div>;
	}

	return (
		<div className="user-component">
			<h2>Users</h2>
			<div className="user-list">
				{state.users.map((user) => (
					<div key={user.id} className="user-item">
						<span>{formatUserName(user)}</span>
						<Button onClick={() => handleUserSelect(user)} variant="primary">
							View Details
						</Button>
					</div>
				))}
			</div>

			{selectedUser && (
				<Modal onClose={handleCloseModal}>
					<h3>{formatUserName(selectedUser)}</h3>
					<p>ID: {selectedUser.id}</p>
					{selectedUser.email && <p>Email: {selectedUser.email}</p>}
				</Modal>
			)}
		</div>
	);
};

export default UserComponent;

// Additional exports for testing
export type { UserProps, ComponentState };
export { formatUserName as userNameFormatter };

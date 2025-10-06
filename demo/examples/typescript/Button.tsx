/**
 * Button Component
 *
 * @semantic-tags: react-component, ui-component, public-api
 * @description: 재사용 가능한 버튼 컴포넌트
 */

import React, { useState, useCallback } from "react";
import { ButtonProps } from "./types/ButtonProps";
import { ButtonStyles } from "./styles/ButtonStyles";
import { Icon } from "./Icon";
import { Spinner } from "./Spinner";

/**
 * 버튼 컴포넌트
 *
 * @semantic-tags: react-component, ui-component, public-api
 * @param props 버튼 속성
 * @returns JSX.Element
 */
export const Button: React.FC<ButtonProps> = ({
	children,
	variant = "primary",
	size = "medium",
	disabled = false,
	loading = false,
	icon,
	iconPosition = "left",
	onClick,
	className,
	...props
}) => {
	const [isPressed, setIsPressed] = useState(false);

	/**
	 * 버튼 클릭 핸들러
	 *
	 * @semantic-tags: event-handler, public-method
	 * @param event 클릭 이벤트
	 */
	const handleClick = useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			if (disabled || loading) {
				event.preventDefault();
				return;
			}

			setIsPressed(true);
			onClick?.(event);

			// 애니메이션을 위한 짧은 지연
			setTimeout(() => setIsPressed(false), 150);
		},
		[disabled, loading, onClick],
	);

	/**
	 * 키보드 이벤트 핸들러
	 *
	 * @semantic-tags: event-handler, accessibility-method
	 * @param event 키보드 이벤트
	 */
	const handleKeyDown = useCallback(
		(event: React.KeyboardEvent<HTMLButtonElement>) => {
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault();
				handleClick(event as any);
			}
		},
		[handleClick],
	);

	/**
	 * 버튼 스타일 클래스 생성
	 *
	 * @semantic-tags: style-method, private-method
	 * @returns 스타일 클래스 문자열
	 */
	const getButtonClasses = useCallback(() => {
		const baseClasses = ButtonStyles.base;
		const variantClasses = ButtonStyles.variants[variant];
		const sizeClasses = ButtonStyles.sizes[size];
		const stateClasses = {
			disabled: disabled ? ButtonStyles.states.disabled : "",
			loading: loading ? ButtonStyles.states.loading : "",
			pressed: isPressed ? ButtonStyles.states.pressed : "",
		};

		return [
			baseClasses,
			variantClasses,
			sizeClasses,
			stateClasses.disabled,
			stateClasses.loading,
			stateClasses.pressed,
			className,
		]
			.filter(Boolean)
			.join(" ");
	}, [variant, size, disabled, loading, isPressed, className]);

	/**
	 * 아이콘 렌더링
	 *
	 * @semantic-tags: render-method, private-method
	 * @returns 아이콘 JSX 또는 null
	 */
	const renderIcon = useCallback(() => {
		if (!icon) return null;

		const iconElement = (
			<Icon
				name={icon}
				size={size === "small" ? "sm" : size === "large" ? "lg" : "md"}
				className="button-icon"
			/>
		);

		return iconElement;
	}, [icon, size]);

	/**
	 * 로딩 스피너 렌더링
	 *
	 * @semantic-tags: render-method, private-method
	 * @returns 스피너 JSX 또는 null
	 */
	const renderSpinner = useCallback(() => {
		if (!loading) return null;

		return (
			<Spinner
				size={size === "small" ? "sm" : size === "large" ? "lg" : "md"}
				className="button-spinner"
			/>
		);
	}, [loading, size]);

	/**
	 * 버튼 콘텐츠 렌더링
	 *
	 * @semantic-tags: render-method, private-method
	 * @returns 버튼 콘텐츠 JSX
	 */
	const renderContent = useCallback(() => {
		const iconElement = renderIcon();
		const spinnerElement = renderSpinner();
		const content = loading ? spinnerElement : children;

		if (!iconElement) {
			return content;
		}

		if (iconPosition === "left") {
			return (
				<>
					{iconElement}
					{content}
				</>
			);
		} else {
			return (
				<>
					{content}
					{iconElement}
				</>
			);
		}
	}, [renderIcon, renderSpinner, children, loading, iconPosition]);

	return (
		<button
			type="button"
			className={getButtonClasses()}
			disabled={disabled || loading}
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			aria-disabled={disabled || loading}
			aria-busy={loading}
			{...props}
		>
			{renderContent()}
		</button>
	);
};

/**
 * 버튼 컴포넌트 기본 내보내기
 */
export default Button;

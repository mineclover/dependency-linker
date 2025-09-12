import React from "react";

interface Props {
	title: string;
	count: number;
}

const SimpleComponent: React.FC<Props> = ({ title, count }) => {
	return (
		<div>
			<h1>{title}</h1>
			<p>Count: {count}</p>
		</div>
	);
};

export default SimpleComponent;

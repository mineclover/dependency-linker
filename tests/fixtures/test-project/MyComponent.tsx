import React from "react";
import { useState, useEffect } from "react";

export const MyComponent = () => {
	const [count, setCount] = useState(0);

	useEffect(() => {
		console.log("Count changed:", count);
	}, [count]);

	return (
		<div>
			<p>Count: {count}</p>
			<button onClick={() => setCount(count + 1)}>Increment</button>
		</div>
	);
};

export default MyComponent;

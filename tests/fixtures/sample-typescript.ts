// import { Service } from "./service"; // Commented out to avoid missing dependency issues

export interface ComponentProps {
	message?: string;
}

export class SampleComponent {
	private data: string = "default";

	constructor(props: ComponentProps = {}) {
		this.data = props.message || "default";
	}

	render(): string {
		return "Hello World";
	}

	getMessage(): string {
		return this.data;
	}
}

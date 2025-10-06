/**
 * Calculator Module
 *
 * @semantic-tags: utility-module, math-domain, public-api
 * @description: 기본적인 수학 연산을 수행하는 계산기 모듈
 */

/**
 * 계산기 클래스
 *
 * @semantic-tags: utility-class, math-domain, public-api
 */
class Calculator {
	constructor() {
		this.history = [];
		this.currentValue = 0;
	}

	/**
	 * 덧셈 연산
	 *
	 * @semantic-tags: math-method, public-api
	 * @param {number} a 첫 번째 숫자
	 * @param {number} b 두 번째 숫자
	 * @returns {number} 덧셈 결과
	 */
	add(a, b) {
		const result = a + b;
		this.history.push({ operation: "add", operands: [a, b], result });
		this.currentValue = result;
		return result;
	}

	/**
	 * 뺄셈 연산
	 *
	 * @semantic-tags: math-method, public-api
	 * @param {number} a 첫 번째 숫자
	 * @param {number} b 두 번째 숫자
	 * @returns {number} 뺄셈 결과
	 */
	subtract(a, b) {
		const result = a - b;
		this.history.push({ operation: "subtract", operands: [a, b], result });
		this.currentValue = result;
		return result;
	}

	/**
	 * 곱셈 연산
	 *
	 * @semantic-tags: math-method, public-api
	 * @param {number} a 첫 번째 숫자
	 * @param {number} b 두 번째 숫자
	 * @returns {number} 곱셈 결과
	 */
	multiply(a, b) {
		const result = a * b;
		this.history.push({ operation: "multiply", operands: [a, b], result });
		this.currentValue = result;
		return result;
	}

	/**
	 * 나눗셈 연산
	 *
	 * @semantic-tags: math-method, public-api
	 * @param {number} a 첫 번째 숫자
	 * @param {number} b 두 번째 숫자
	 * @returns {number} 나눗셈 결과
	 */
	divide(a, b) {
		if (b === 0) {
			throw new Error("Division by zero is not allowed");
		}
		const result = a / b;
		this.history.push({ operation: "divide", operands: [a, b], result });
		this.currentValue = result;
		return result;
	}

	/**
	 * 거듭제곱 연산
	 *
	 * @semantic-tags: math-method, public-api
	 * @param {number} base 밑
	 * @param {number} exponent 지수
	 * @returns {number} 거듭제곱 결과
	 */
	power(base, exponent) {
		const result = Math.pow(base, exponent);
		this.history.push({
			operation: "power",
			operands: [base, exponent],
			result,
		});
		this.currentValue = result;
		return result;
	}

	/**
	 * 제곱근 연산
	 *
	 * @semantic-tags: math-method, public-api
	 * @param {number} number 숫자
	 * @returns {number} 제곱근 결과
	 */
	sqrt(number) {
		if (number < 0) {
			throw new Error("Square root of negative number is not allowed");
		}
		const result = Math.sqrt(number);
		this.history.push({ operation: "sqrt", operands: [number], result });
		this.currentValue = result;
		return result;
	}

	/**
	 * 계산 기록 조회
	 *
	 * @semantic-tags: history-method, public-api
	 * @returns {Array} 계산 기록 배열
	 */
	getHistory() {
		return [...this.history];
	}

	/**
	 * 계산 기록 초기화
	 *
	 * @semantic-tags: reset-method, public-api
	 */
	clearHistory() {
		this.history = [];
		this.currentValue = 0;
	}

	/**
	 * 현재 값 조회
	 *
	 * @semantic-tags: getter-method, public-api
	 * @returns {number} 현재 값
	 */
	getCurrentValue() {
		return this.currentValue;
	}

	/**
	 * 계산 기록을 문자열로 변환
	 *
	 * @semantic-tags: format-method, public-api
	 * @returns {string} 계산 기록 문자열
	 */
	getHistoryString() {
		return this.history
			.map((entry) => {
				const { operation, operands, result } = entry;
				return `${operands.join(` ${operation} `)} = ${result}`;
			})
			.join("\n");
	}
}

/**
 * 고급 수학 함수들
 *
 * @semantic-tags: math-utilities, public-api
 */
const MathUtils = {
	/**
	 * 팩토리얼 계산
	 *
	 * @semantic-tags: math-function, public-api
	 * @param {number} n 숫자
	 * @returns {number} 팩토리얼 결과
	 */
	factorial(n) {
		if (n < 0) {
			throw new Error("Factorial of negative number is not allowed");
		}
		if (n === 0 || n === 1) {
			return 1;
		}
		return n * MathUtils.factorial(n - 1);
	},

	/**
	 * 최대공약수 계산
	 *
	 * @semantic-tags: math-function, public-api
	 * @param {number} a 첫 번째 숫자
	 * @param {number} b 두 번째 숫자
	 * @returns {number} 최대공약수
	 */
	gcd(a, b) {
		if (b === 0) {
			return Math.abs(a);
		}
		return MathUtils.gcd(b, a % b);
	},

	/**
	 * 최소공배수 계산
	 *
	 * @semantic-tags: math-function, public-api
	 * @param {number} a 첫 번째 숫자
	 * @param {number} b 두 번째 숫자
	 * @returns {number} 최소공배수
	 */
	lcm(a, b) {
		return Math.abs(a * b) / MathUtils.gcd(a, b);
	},
};

/**
 * 계산기 인스턴스 생성 함수
 *
 * @semantic-tags: factory-function, public-api
 * @returns {Calculator} 계산기 인스턴스
 */
function createCalculator() {
	return new Calculator();
}

/**
 * 모듈 내보내기
 */
module.exports = {
	Calculator,
	MathUtils,
	createCalculator,
};

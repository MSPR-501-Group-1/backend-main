export function calculateAge(birthDate) {
	if (!birthDate) {
		return null;
	}

	const date = birthDate instanceof Date ? birthDate : new Date(birthDate);

	if (Number.isNaN(date.getTime())) {
		return null;
	}

	const today = new Date();
	let age = today.getFullYear() - date.getFullYear();
	const monthDifference = today.getMonth() - date.getMonth();

	if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < date.getDate())) {
		age -= 1;
	}

	return age;
}

export default calculateAge;

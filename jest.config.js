module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    rootDir: '.',
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
    }
};
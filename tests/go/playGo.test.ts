import {NS} from '@ns'
import { describe, expect, test, jest } from '@jest/globals';
import {evaluateBoard, getChains, getLibertyCounts} from "@/go/playGo";

type Board = string[];

// Mock the NS object and go API
const mockGetControlledEmptyNodes = jest.fn();
const mockNS: NS = {
    go: {
        analysis: {
            getControlledEmptyNodes: mockGetControlledEmptyNodes
        }
    }
} as unknown as NS;

describe('evaluateBoard', () => {
    beforeEach(() => {
        mockGetControlledEmptyNodes.mockClear();
    });

    test('empty board should evaluate to 0', () => {
        const board = [
            '.....',
            '.....',
            '.....',
            '.....',
            '.....'
        ];
        mockGetControlledEmptyNodes.mockReturnValue([
            '.....',
            '.....',
            '.....',
            '.....',
            '.....'
        ]);

        expect(evaluateBoard(mockNS, board)).toBe(0);
    });

    test('board with equal pieces should consider territory', () => {
        const board = [
            'X.O..',
            '.....',
            '.....',
            '.....',
            '.....'
        ];
        // Mock black controlling more territory
        mockGetControlledEmptyNodes.mockReturnValue([
            'XX...',
            'X....',
            '.....',
            '.....',
            '.....'
        ]);

        expect(evaluateBoard(mockNS, board)).toBeGreaterThan(0);
    });

    test('should handle complex positions', () => {
        const board = [
            'XO...',
            'OX...',
            '.XO..',
            '.....',
            '.....'
        ];
        mockGetControlledEmptyNodes.mockReturnValue([
            'XO...',
            'OX...',
            '.XO..',
            '.XX..',
            '.X...'
        ]);

        const score = evaluateBoard(mockNS, board);
        expect(typeof score).toBe('number');
        // Verify black has advantage due to controlled territory
        expect(score).toBeGreaterThan(0);
    });

    test('should handle board edges', () => {
        const board = [
            'X....',
            'O....',
            '.....',
            '....O',
            '....X'
        ];
        mockGetControlledEmptyNodes.mockReturnValue([
            'X....',
            'X....',
            'X...O',
            '....O',
            '....X'
        ]);

        expect(evaluateBoard(mockNS, board)).toBe(1); // Black has slight edge
    });

    test('should count controlled empty spaces correctly', () => {
        const board = [
            'XX...',
            'OO...',
            '.....',
            '.....',
            '.....'
        ];
        mockGetControlledEmptyNodes.mockReturnValue([
            'XX...',
            'OO...',
            'XX...',
            '.....',
            '.....'
        ]);

        // 2 direct black, 2 direct white, 2 controlled empty for black
        expect(evaluateBoard(mockNS, board)).toBe(2);
    });
});


describe('getChains', () => {
    test('single simple chain', () => {
        const board = [
            'OOO',
            '...',
            '...'
        ];
        expect(getChains(board)).toEqual([
            [0, 0, 0],
            [1, 1, 1],
            [1, 1, 1]
        ]);
    });

    test('multiple chains', () => {
        const board = [
            'O.X',
            '..X',
            'O..'
        ];
        expect(getChains(board)).toEqual([
            [0, 1, 2],
            [1, 1, 2],
            [3, 1, 1]
        ]);
    });

    test('handles walls', () => {
        const board = [
            'O#O',
            '#.#',
            'X#X'
        ];
        expect(getChains(board)).toEqual([
            [0, null, 1],
            [null, 2, null],
            [3, null, 4]
        ]);
    });

    test('connected chain around wall', () => {
        const board = [
            'OOO',
            'O#O',
            'OOO'
        ];
        expect(getChains(board)).toEqual([
            [0, 0, 0],
            [0, null, 0],
            [0, 0, 0]
        ]);
    });
});

describe('getLibertyCounts', () => {
    test('empty board', () => {
        const board = [
            '...',
            '...',
            '...'
        ];
        expect(getLibertyCounts(board)).toEqual([
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]
        ]);
    });

    test('single stone', () => {
        const board = [
            '.O.',
            '...',
            '...'
        ];
        expect(getLibertyCounts(board)).toEqual([
            [0, 3, 0],
            [0, 0, 0],
            [0, 0, 0]
        ]);
    });

    test('chain with shared liberties', () => {
        const board = [
            'OO.',
            '...',
            '...'
        ];
        expect(getLibertyCounts(board)).toEqual([
            [3, 3, 0],
            [0, 0, 0],
            [0, 0, 0]
        ]);
    });

    test('surrounded piece', () => {
        const board = [
            '.X.',
            'XOX',
            '.X.'
        ];
        expect(getLibertyCounts(board)).toEqual([
            [0, 2, 0],
            [2, 0, 2],
            [0, 2, 0]
        ]);
    });

    test('dead nodes', () => {
        const board = [
            '.#.',
            '#O#',
            '.#.'
        ];
        expect(getLibertyCounts(board)).toEqual([
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]
        ]);
    });
});
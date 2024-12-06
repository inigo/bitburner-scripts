/* eslint-disable @typescript-eslint/no-non-null-assertion */
/// Sell hashes for the specified result - expected to be called regularly
import {NS} from '@ns'

export async function main(ns: NS): Promise<void> {
    await startGame(ns);
}

async function startGame(ns: NS) {
    ns.go.resetBoardState(Opponent.Netburners, 7);

    let newState: MoveResults = { type: null, x: -1, y: -1};
    while (newState.type!=='gameOver') {
        if (newState.type == 'pass' && noHelpfulMoves(ns)) {
            newState = await ns.go.passTurn()
        } else {
            const board = ns.go.getBoardState();
            const move = selectMove(ns, board);
            if (move) {
                const [x, y] = move;
                newState = await ns.go.makeMove(x, y);
            } else {
                newState = await ns.go.passTurn()
            }
        }
    }
    const result = ns.go.getGameState();
    const score = result.blackScore - result.whiteScore;
    const scoreText = (score > 0) ? `We won, by ${score} points` : `We lost, by ${Math.abs(score)} points`;
    ns.toast("Game finished: " + scoreText);
    ns.print("Game finished: " + scoreText);
    return score;
}

function selectMove(ns: NS, board: Board): Move | null {
    const validMoves = ns.go.analysis.getValidMoves();
    const richBoard = toRichBoard(ns, board);
    const reasonableMove = getReasonableMove(ns, richBoard);
    const isReasonableMoveValid = reasonableMove!=null && validMoves[reasonableMove[0]][reasonableMove[1]];
    return isReasonableMoveValid ? reasonableMove : getRandomMove(ns, board, validMoves);
}

function getReasonableMove(ns: NS, board: RichBoard): Move | null {
    function getAdjacentNodes(node: RichNode): RichNode[] {
        const directions = [
            { x: 0, y: -1 },  // up
            { x: 0, y: 1 },   // down
            { x: 1, y: 0 },   // right
            { x: -1, y: 0 }   // left
        ];
        const adjacentNodes: RichNode[] = [];
        for (const dir of directions) {
            const newX = node.x + dir.x;
            const newY = node.y + dir.y;

            if (newX >= 0 && newX < board.length &&
                newY >= 0 && newY < board[0].length) {
                adjacentNodes.push(board[newX][newY]);
            }
        }
        return adjacentNodes;
    }

    const moveOptions: ScoredMove[] = [];
    const size = board[0].length;
    // Look through all the points on the board
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            const node = board[x][y];
            if (node.isValidMove) {
                const adjacentNodes = getAdjacentNodes(node);
                const hasVulnerableWhite = adjacentNodes.some(node => node.liberties === 1 && node.owner === "white");
                const hasVulnerableBlack = adjacentNodes.some(node => node.liberties === 1 && node.owner === "black");
                const isPossiblyOwnEye = node.isEye=="black" || (node.isEmpty && node.isControlled=="black");

                const score = (hasVulnerableBlack ? 5 : 0) + (hasVulnerableWhite ? 5 : 0) + (isPossiblyOwnEye ? -1000 : 0);
                const move: Move = [x, y];
                if (score > 0) {
                    const scoredMove: ScoredMove = { score, move  }
                    moveOptions.push(scoredMove);
                }
            }
        }
    }

    // @todo Sort scored moves and return highest

}

function getRandomMove(ns: NS, board: Board, validMoves: ValidMoves): Move | null {
    const moveOptions = [];
    const size = board[0].length;

    // Look through all the points on the board
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            // Make sure the point is a valid move
            const isValidMove = validMoves[x][y];
            // Leave some spaces to make it harder to capture our pieces.
            // We don't want to run out of empty node connections!
            const isNotReservedSpace = x % 2 === 1 || y % 2 === 1;

            if (isValidMove && isNotReservedSpace) {
                moveOptions.push([x, y]);
            }
        }
    }

    // Choose one of the found moves at random
    const randomIndex = Math.floor(Math.random() * moveOptions.length);
    return moveOptions[randomIndex] ?? null;
}

function newBoardState(ns: NS, board: Board, move: Move): Board {
    // @todo Implement

    return board;
}

function toRichBoard(ns: NS, board: Board): RichBoard {
    const liberties = ns.go.analysis.getLiberties(board);
    const chains = ns.go.analysis.getChains(board);
    const validMoves = ns.go.analysis.getValidMoves(board);
    const controlledEmptyNodes = ns.go.analysis.getControlledEmptyNodes(board);
    const richNodes: RichNode[][] = Array(board.length).fill(null).map(() =>
        Array(board.length).fill(null)
    );

    for (let x = 0; x < board.length; x++) {
        for (let y = 0; y < board[x].length; y++) {
            const liberty = liberties[x][y];
            const chainId = chains[x][y];
            const piece = board[x][y] as "X" | "O" | "." | "#";
            const isDead = piece == "#";
            const isValidMove = validMoves[x][y]; // @todo This is only evaluating one board, so might miss ko's
            const owner = (piece === 'X') ? "black" : (piece === 'O') ? "white" : (piece === '#') ? "dead" : "empty";
            const control = controlledEmptyNodes[x][y];
            const isControlled = (owner!="empty") ? owner : (control === 'X') ? "black" : (control === 'O') ? "white" : "no";
            const isEmpty = piece == ".";
            const isEye = "unknown";
            richNodes[x][y] = {x, y, owner, liberties: liberty, chainId, isValidMove, isDead, isEmpty, isControlled, isEye, piece};
        }
    }
    return richNodes;
}

function evaluateBoard(ns: NS, board: Board): number {

    // @todo This is a simple count. Better to work out eyes, and weight safely-owned spaces higher

    function count(b: Board) {
        let black = 0;
        let white = 0;

        for (const str of b) {
            for (const char of str) {
                if (char === 'X') black++;
                else if (char === 'O') white++;
            }
        }
        return [black, white];
    }
    const [directBlack, directWhite] = count(board);
    const [emptyBlack, emptyWhite] = count(ns.go.analysis.getControlledEmptyNodes(board));

    return (directBlack + emptyBlack) - (directWhite - emptyWhite);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function noHelpfulMoves(ns: NS): boolean {
    // @todo Initially, if the opponent passes, we pass too
    return true;
}

type Board = string[];
type ValidMoves = boolean[][];
type Move = number[]
type RichBoard = RichNode[][];

type MoveResults = {
    type: "move" | "pass" | "gameOver" | null;
    x: number | null;
    y: number | null;
}

type ScoredMove = {
    score: number,
    move: Move
}

type RichNode = {
    x: number;
    y: number;
    owner: "black" | "white" | "empty" | "dead";
    liberties: number;
    chainId: number | null;
    isValidMove: boolean;
    isDead: boolean;
    isEmpty: boolean;
    isControlled: "black" | "white" | "no" | "dead";
    isEye: "black" | "white" | "no" | "dead" | "unknown" ; // @todo Remove unknown once we know
    piece: "X" | "O" | "." | "#";
};

enum Opponent {
    Netburners = "Netburners",
    SlumSnakes = "Slum Snakes",
    TheBlackHand = "The Black Hand",
    Tetrads = "Tetrads",
    Daedalus = "Daedalus",
    Illuminati = "Illuminati",
    Unknown = "????????????"
}
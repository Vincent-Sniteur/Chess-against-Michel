// main.js - Encore des bugs et mauvaise logique

// =========================================
// CONSTANTES ET VARIABLES GLOBALES
// =========================================

// Représentation de l'échiquier
const EMPTY = null;
const PIECES = {
    KING: 'k',
    QUEEN: 'q',
    ROOK: 'r',
    BISHOP: 'b',
    KNIGHT: 'n',
    PAWN: 'p'
};

const COLORS = {
    WHITE: 'w',
    BLACK: 'b'
};

// Variables d'état du jeu
let board = [];
let currentTurn = COLORS.WHITE;
let castlingRights = { 
    w: { kingSide: true, queenSide: true },
    b: { kingSide: true, queenSide: true }
};
let enPassantTarget = null;
let halfMoveClock = 0;
let fullMoveNumber = 1;
let moveHistory = [];
let gameStarted = false;
let selectedSquare = null;
let playerColor = COLORS.WHITE;
let aiColor = COLORS.BLACK;
let currentDifficulty = 2; // Par défaut: Moyen
let isPlayerTurn = true;
let thinking = false;
let boardFlipped = false;
let pendingPromotion = null;
let clocks = {
    white: { time: 0, interval: null },
    black: { time: 0, interval: null }
};

// =========================================
// INITIALISATION
// =========================================

document.addEventListener('DOMContentLoaded', () => {
    initialize();
    updateLoadingBar(100);
});

function initialize() {
    // Initialiser le plateau
    setupBoard();
    
    // Créer l'affichage de l'échiquier
    createChessboard();
    
    // Configurer les écouteurs d'événements
    setupEventListeners();
    
    // Initialiser l'interface utilisateur
    initializeUI();
    
    // Mettre à jour le statut du jeu
    updateGameStatus("En attente du choix de couleur...");
}

function updateLoadingBar(percentage) {
    document.getElementById('loading-bar').style.width = `${percentage}%`;
    if (percentage >= 100) {
        setTimeout(() => {
            document.getElementById('loading-bar').style.opacity = '0';
        }, 500);
    }
}

// =========================================
// LOGIQUE DU JEU D'ÉCHECS
// =========================================

function setupBoard() {
    // Créer un plateau vide 8x8
    board = Array(8).fill().map(() => Array(8).fill(EMPTY));
    
    // Placer les pièces sur le plateau
    setupPieces();
    
    // Réinitialiser les variables d'état
    currentTurn = COLORS.WHITE;
    castlingRights = { 
        w: { kingSide: true, queenSide: true },
        b: { kingSide: true, queenSide: true }
    };
    enPassantTarget = null;
    halfMoveClock = 0;
    fullMoveNumber = 1;
    moveHistory = [];
}

function setupPieces() {
    // Placer les pions
    for (let col = 0; col < 8; col++) {
        board[1][col] = { type: PIECES.PAWN, color: COLORS.BLACK };
        board[6][col] = { type: PIECES.PAWN, color: COLORS.WHITE };
    }
    
    // Placer les tours
    board[0][0] = { type: PIECES.ROOK, color: COLORS.BLACK };
    board[0][7] = { type: PIECES.ROOK, color: COLORS.BLACK };
    board[7][0] = { type: PIECES.ROOK, color: COLORS.WHITE };
    board[7][7] = { type: PIECES.ROOK, color: COLORS.WHITE };
    
    // Placer les cavaliers
    board[0][1] = { type: PIECES.KNIGHT, color: COLORS.BLACK };
    board[0][6] = { type: PIECES.KNIGHT, color: COLORS.BLACK };
    board[7][1] = { type: PIECES.KNIGHT, color: COLORS.WHITE };
    board[7][6] = { type: PIECES.KNIGHT, color: COLORS.WHITE };
    
    // Placer les fous
    board[0][2] = { type: PIECES.BISHOP, color: COLORS.BLACK };
    board[0][5] = { type: PIECES.BISHOP, color: COLORS.BLACK };
    board[7][2] = { type: PIECES.BISHOP, color: COLORS.WHITE };
    board[7][5] = { type: PIECES.BISHOP, color: COLORS.WHITE };
    
    // Placer les reines
    board[0][3] = { type: PIECES.QUEEN, color: COLORS.BLACK };
    board[7][3] = { type: PIECES.QUEEN, color: COLORS.WHITE };
    
    // Placer les rois
    board[0][4] = { type: PIECES.KING, color: COLORS.BLACK };
    board[7][4] = { type: PIECES.KING, color: COLORS.WHITE };
}

function getPieceAt(position) {
    const { row, col } = getSquareCoordinates(position);
    return board[row][col];
}

function setPieceAt(position, piece) {
    const { row, col } = getSquareCoordinates(position);
    board[row][col] = piece;
}

function movePiece(from, to, promotion = null) {
    // Obtenir les coordonnées
    const fromCoords = getSquareCoordinates(from);
    const toCoords = getSquareCoordinates(to);
    
    // Récupérer la pièce
    const piece = board[fromCoords.row][fromCoords.col];
    if (!piece) return false;
    
    // Vérifier si le mouvement est légal
    if (!isLegalMove(from, to)) return false;
    
    // Capturer toute pièce sur la case de destination (si elle existe)
    const capturedPiece = board[toCoords.row][toCoords.col];
    
    // Vérifier s'il s'agit d'une prise en passant
    let enPassantCapture = null;
    if (piece.type === PIECES.PAWN && to === enPassantTarget) {
        const epRow = currentTurn === COLORS.WHITE ? toCoords.row + 1 : toCoords.row - 1;
        enPassantCapture = { row: epRow, col: toCoords.col };
        board[epRow][toCoords.col] = EMPTY;
    }
    
    // Mettre à jour le plateau
    board[toCoords.row][toCoords.col] = piece;
    board[fromCoords.row][fromCoords.col] = EMPTY;
    
    // Gestion des promotions de pions
    if (piece.type === PIECES.PAWN && (toCoords.row === 0 || toCoords.row === 7)) {
        if (promotion) {
            board[toCoords.row][toCoords.col] = { type: promotion, color: piece.color };
        } else {
            // Si pas de promotion spécifiée, retourner false et rétablir le plateau
            board[toCoords.row][toCoords.col] = piece;
            board[fromCoords.row][fromCoords.col] = piece;
            if (capturedPiece) {
                board[toCoords.row][toCoords.col] = capturedPiece;
            }
            return false;
        }
    }
    
    // Gestion du roque
    if (piece.type === PIECES.KING) {
        // Roque du côté roi
        if (from === 'e1' && to === 'g1') {
            // Déplacer la tour
            board[7][5] = board[7][7];
            board[7][7] = EMPTY;
        } else if (from === 'e8' && to === 'g8') {
            board[0][5] = board[0][7];
            board[0][7] = EMPTY;
        }
        // Roque du côté reine
        else if (from === 'e1' && to === 'c1') {
            board[7][3] = board[7][0];
            board[7][0] = EMPTY;
        } else if (from === 'e8' && to === 'c8') {
            board[0][3] = board[0][0];
            board[0][0] = EMPTY;
        }
        
        // Désactiver le droit au roque pour ce roi
        castlingRights[piece.color].kingSide = false;
        castlingRights[piece.color].queenSide = false;
    }
    
    // Mise à jour des droits au roque pour les tours
    if (piece.type === PIECES.ROOK) {
        if (from === 'a1') castlingRights.w.queenSide = false;
        if (from === 'h1') castlingRights.w.kingSide = false;
        if (from === 'a8') castlingRights.b.queenSide = false;
        if (from === 'h8') castlingRights.b.kingSide = false;
    }
    
    // Déterminer s'il s'agit d'un double mouvement de pion pour en-passant
    enPassantTarget = null;
    if (piece.type === PIECES.PAWN) {
        const rowDiff = Math.abs(fromCoords.row - toCoords.row);
        if (rowDiff === 2) {
            const epRow = currentTurn === COLORS.WHITE ? fromCoords.row - 1 : fromCoords.row + 1;
            enPassantTarget = getSquareNotation(epRow, fromCoords.col);
        }
    }
    
    // Créer un objet de mouvement pour l'historique
    const moveObj = {
        piece: piece,
        from: from,
        to: to,
        captured: capturedPiece,
        enPassantCapture: enPassantCapture ? getSquareNotation(enPassantCapture.row, enPassantCapture.col) : null,
        promotion: promotion,
        castling: isCastling(piece, from, to),
        check: false, // À mettre à jour plus tard
        checkmate: false, // À mettre à jour plus tard
        san: generateSAN(piece, from, to, capturedPiece, promotion)
    };
    
    // Incrémenter le compteur de demi-coups pour la règle des 50 coups
    if (piece.type === PIECES.PAWN || capturedPiece) {
        halfMoveClock = 0;
    } else {
        halfMoveClock++;
    }
    
    // Changer de tour
    currentTurn = currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    
    // Incrémenter le compteur de coups complets après un mouvement des noirs
    if (piece.color === COLORS.BLACK) {
        fullMoveNumber++;
    }
    
    // Vérifier si le roi est en échec
    moveObj.check = isKingInCheck(currentTurn);
    
    // Vérifier le pat et l'échec et mat
    if (isCheckmate(currentTurn)) {
        moveObj.checkmate = true;
    }
    
    // Ajouter le mouvement à l'historique
    moveHistory.push(moveObj);
    
    return moveObj;
}

function isLegalMove(from, to) {
    // Obtenir les coordonnées
    const fromCoords = getSquareCoordinates(from);
    const toCoords = getSquareCoordinates(to);
    
    // Récupérer la pièce
    const piece = board[fromCoords.row][fromCoords.col];
    
    // Vérifier si la pièce existe et si c'est au tour du joueur
    if (!piece || piece.color !== currentTurn) return false;
    
    // Vérifier si la destination est la même que l'origine
    if (from === to) return false;
    
    // Vérifier si la destination contient une pièce de même couleur
    const targetPiece = board[toCoords.row][toCoords.col];
    if (targetPiece && targetPiece.color === piece.color) return false;
    
    // Vérifier en fonction du type de pièce
    let isValid = false;
    
    switch (piece.type) {
        case PIECES.PAWN:
            isValid = isValidPawnMove(fromCoords, toCoords, piece.color);
            break;
        case PIECES.KNIGHT:
            isValid = isValidKnightMove(fromCoords, toCoords);
            break;
        case PIECES.BISHOP:
            isValid = isValidBishopMove(fromCoords, toCoords);
            break;
        case PIECES.ROOK:
            isValid = isValidRookMove(fromCoords, toCoords);
            break;
        case PIECES.QUEEN:
            isValid = isValidQueenMove(fromCoords, toCoords);
            break;
        case PIECES.KING:
            isValid = isValidKingMove(fromCoords, toCoords, piece.color);
            break;
    }
    
    // Si le mouvement n'est pas valide, retourner false
    if (!isValid) return false;
    
    // Vérifier si le roi serait en échec après ce mouvement
    if (wouldKingBeInCheck(from, to, piece.color)) return false;
    
    return true;
}

function isValidPawnMove(from, to, color) {
    const direction = color === COLORS.WHITE ? -1 : 1;
    const startRow = color === COLORS.WHITE ? 6 : 1;
    const colDiff = Math.abs(to.col - from.col);
    const rowDiff = to.row - from.row;
    
    // Mouvement en avant
    if (colDiff === 0) {
        // Avancée simple
        if (rowDiff === direction && board[to.row][to.col] === EMPTY) {
            return true;
        }
        // Double avancée depuis la rangée de départ
        if (from.row === startRow && rowDiff === 2 * direction && 
            board[from.row + direction][from.col] === EMPTY && 
            board[to.row][to.col] === EMPTY) {
            return true;
        }
    }
    // Capture diagonale
    else if (colDiff === 1 && rowDiff === direction) {
        // Capture normale
        if (board[to.row][to.col] !== EMPTY && board[to.row][to.col].color !== color) {
            return true;
        }
        // Prise en passant
        const epTarget = getSquareNotation(to.row, to.col);
        if (epTarget === enPassantTarget) {
            return true;
        }
    }
    
    return false;
}

function isValidKnightMove(from, to) {
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);
    
    // Le cavalier se déplace en "L": 2 cases dans une direction, puis 1 case perpendiculairement
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
}

function isValidBishopMove(from, to) {
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);
    
    // Le fou se déplace en diagonale
    if (rowDiff !== colDiff) return false;
    
    // Vérifier s'il y a des pièces sur le chemin
    const rowDir = to.row > from.row ? 1 : -1;
    const colDir = to.col > from.col ? 1 : -1;
    
    for (let i = 1; i < rowDiff; i++) {
        if (board[from.row + i * rowDir][from.col + i * colDir] !== EMPTY) {
            return false;
        }
    }
    
    return true;
}

function isValidRookMove(from, to) {
    // La tour se déplace horizontalement ou verticalement
    if (from.row !== to.row && from.col !== to.col) return false;
    
    // Vérifier s'il y a des pièces sur le chemin
    if (from.row === to.row) {
        // Mouvement horizontal
        const colDir = to.col > from.col ? 1 : -1;
        for (let c = from.col + colDir; c !== to.col; c += colDir) {
            if (board[from.row][c] !== EMPTY) return false;
        }
    } else {
        // Mouvement vertical
        const rowDir = to.row > from.row ? 1 : -1;
        for (let r = from.row + rowDir; r !== to.row; r += rowDir) {
            if (board[r][from.col] !== EMPTY) return false;
        }
    }
    
    return true;
}

function isValidQueenMove(from, to) {
    // La reine se déplace comme un fou ou une tour
    return isValidBishopMove(from, to) || isValidRookMove(from, to);
}

function isValidKingMove(from, to, color) {
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);
    
    // Mouvement normal du roi (1 case dans n'importe quelle direction)
    if (rowDiff <= 1 && colDiff <= 1) return true;
    
    // Vérifier le roque
    if (rowDiff === 0 && colDiff === 2) {
        // Le roque n'est pas possible si le roi est en échec
        if (isKingInCheck(color)) return false;
        
        const row = color === COLORS.WHITE ? 7 : 0;
        
        // Roque côté roi
        if (to.col === 6 && castlingRights[color].kingSide) {
            // Vérifier que les cases entre le roi et la tour sont vides
            if (board[row][5] !== EMPTY || board[row][6] !== EMPTY) return false;
            
            // Vérifier que le roi ne passe pas par une case attaquée
            if (isSquareAttacked(getSquareNotation(row, 5), color)) return false;
            
            return true;
        }
        // Roque côté reine
        else if (to.col === 2 && castlingRights[color].queenSide) {
            // Vérifier que les cases entre le roi et la tour sont vides
            if (board[row][1] !== EMPTY || board[row][2] !== EMPTY || board[row][3] !== EMPTY) return false;
            
            // Vérifier que le roi ne passe pas par une case attaquée
            if (isSquareAttacked(getSquareNotation(row, 3), color)) return false;
            
            return true;
        }
    }
    
    return false;
}

function isSquareAttacked(square, color) {
    const { row, col } = getSquareCoordinates(square);
    const oppositeColor = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    
    // Vérifier les attaques de pions
    const pawnDirection = color === COLORS.WHITE ? -1 : 1;
    const pawnRows = [row + pawnDirection];
    const pawnCols = [col - 1, col + 1];
    
    for (const r of pawnRows) {
        for (const c of pawnCols) {
            if (r >= 0 && r < 8 && c >= 0 && c < 8) {
                const piece = board[r][c];
                if (piece && piece.type === PIECES.PAWN && piece.color === oppositeColor) {
                    return true;
                }
            }
        }
    }
    
    // Vérifier les attaques de cavaliers
    const knightMoves = [
        { r: -2, c: -1 }, { r: -2, c: 1 }, { r: -1, c: -2 }, { r: -1, c: 2 },
        { r: 1, c: -2 }, { r: 1, c: 2 }, { r: 2, c: -1 }, { r: 2, c: 1 }
    ];
    
    for (const move of knightMoves) {
        const r = row + move.r;
        const c = col + move.c;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const piece = board[r][c];
            if (piece && piece.type === PIECES.KNIGHT && piece.color === oppositeColor) {
                return true;
            }
        }
    }
    
    // Vérifier les attaques de fous et de reines (diagonales)
    const bishopDirections = [
        { r: -1, c: -1 }, { r: -1, c: 1 }, { r: 1, c: -1 }, { r: 1, c: 1 }
    ];
    
    for (const dir of bishopDirections) {
        let r = row + dir.r;
        let c = col + dir.c;
        
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const piece = board[r][c];
            if (piece !== EMPTY) {
                if ((piece.type === PIECES.BISHOP || piece.type === PIECES.QUEEN) && 
                    piece.color === oppositeColor) {
                    return true;
                }
                break;
            }
            r += dir.r;
            c += dir.c;
        }
    }
    
    // Vérifier les attaques de tours et de reines (lignes et colonnes)
    const rookDirections = [
        { r: -1, c: 0 }, { r: 1, c: 0 }, { r: 0, c: -1 }, { r: 0, c: 1 }
    ];
    
    for (const dir of rookDirections) {
        let r = row + dir.r;
        let c = col + dir.c;
        
        while (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const piece = board[r][c];
            if (piece !== EMPTY) {
                if ((piece.type === PIECES.ROOK || piece.type === PIECES.QUEEN) && 
                    piece.color === oppositeColor) {
                    return true;
                }
                break;
            }
            r += dir.r;
            c += dir.c;
        }
    }
    
    // Vérifier les attaques du roi
    const kingMoves = [
        { r: -1, c: -1 }, { r: -1, c: 0 }, { r: -1, c: 1 },
        { r: 0, c: -1 }, { r: 0, c: 1 },
        { r: 1, c: -1 }, { r: 1, c: 0 }, { r: 1, c: 1 }
    ];
    
    for (const move of kingMoves) {
        const r = row + move.r;
        const c = col + move.c;
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
            const piece = board[r][c];
            if (piece && piece.type === PIECES.KING && piece.color === oppositeColor) {
                return true;
            }
        }
    }
    
    return false;
}

function isKingInCheck(color) {
    // Trouver la position du roi
    let kingPosition = null;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.type === PIECES.KING && piece.color === color) {
                kingPosition = getSquareNotation(row, col);
                break;
            }
        }
        if (kingPosition) break;
    }
    
    if (!kingPosition) return false; // Si pas de roi (ne devrait jamais arriver)
    
    // Vérifier si le roi est attaqué
    return isSquareAttacked(kingPosition, color);
}

function wouldKingBeInCheck(from, to, color) {
    // Sauvegarder l'état du plateau
    const fromCoords = getSquareCoordinates(from);
    const toCoords = getSquareCoordinates(to);
    const pieceFrom = board[fromCoords.row][fromCoords.col];
    const pieceTo = board[toCoords.row][toCoords.col];
    
    // Faire le mouvement temporairement
    board[toCoords.row][toCoords.col] = pieceFrom;
    board[fromCoords.row][fromCoords.col] = EMPTY;
    
    // Vérifier si le roi est en échec
    const inCheck = isKingInCheck(color);
    
    // Rétablir le plateau
    board[fromCoords.row][fromCoords.col] = pieceFrom;
    board[toCoords.row][toCoords.col] = pieceTo;
    
    return inCheck;
}

function isCheckmate(color) {
    // Si le roi n'est pas en échec, ce n'est pas un échec et mat
    if (!isKingInCheck(color)) return false;
    
    // Vérifier s'il existe au moins un mouvement légal
    return !hasLegalMoves(color);
}

function isStalemate(color) {
    // Si le roi est en échec, ce n'est pas un pat
    if (isKingInCheck(color)) return false;
    
    // Vérifier s'il existe au moins un mouvement légal
    return !hasLegalMoves(color);
}

function hasLegalMoves(color) {
    // Parcourir toutes les pièces de la couleur donnée
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.color === color) {
                const from = getSquareNotation(row, col);
                
                // Vérifier tous les mouvements possibles pour cette pièce
                for (let toRow = 0; toRow < 8; toRow++) {
                    for (let toCol = 0; toCol < 8; toCol++) {
                        const to = getSquareNotation(toRow, toCol);
                        
                        // Sauvegarder l'état actuel du jeu
                        const savedTurn = currentTurn;
                        currentTurn = color; // Temporairement définir le tour
                        
                        // Vérifier si le mouvement est légal
                        const isLegal = isLegalMove(from, to);
                        
                        // Restaurer l'état du jeu
                        currentTurn = savedTurn;
                        
                        if (isLegal) return true;
                    }
                }
            }
        }
    }
    
    return false;
}

function isCastling(piece, from, to) {
    if (piece.type !== PIECES.KING) return false;
    
    const fromCoords = getSquareCoordinates(from);
    const toCoords = getSquareCoordinates(to);
    
    // Vérifier si le mouvement est un roque (déplacement horizontal de 2)
    return Math.abs(toCoords.col - fromCoords.col) === 2;
}

function isDrawByInsufficientMaterial() {
    let pieces = {
        bishops: { w: [], b: [] },
        knights: { w: 0, b: 0 },
        otherPieces: { w: 0, b: 0 }
    };
    
    // Compter les pièces
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.type !== PIECES.KING) {
                if (piece.type === PIECES.BISHOP) {
                    pieces.bishops[piece.color].push((row + col) % 2); // Stocker la parité pour déterminer la couleur de la case
                } else if (piece.type === PIECES.KNIGHT) {
                    pieces.knights[piece.color]++;
                } else {
                    pieces.otherPieces[piece.color]++;
                }
            }
        }
    }
    
    // Roi contre roi
    if (pieces.bishops.w.length === 0 && pieces.knights.w === 0 && pieces.otherPieces.w === 0 &&
        pieces.bishops.b.length === 0 && pieces.knights.b === 0 && pieces.otherPieces.b === 0) {
        return true;
    }
    
    // Roi et fou contre roi
    if ((pieces.bishops.w.length === 1 && pieces.knights.w === 0 && pieces.otherPieces.w === 0 &&
         pieces.bishops.b.length === 0 && pieces.knights.b === 0 && pieces.otherPieces.b === 0) ||
        (pieces.bishops.b.length === 1 && pieces.knights.b === 0 && pieces.otherPieces.b === 0 &&
         pieces.bishops.w.length === 0 && pieces.knights.w === 0 && pieces.otherPieces.w === 0)) {
        return true;
    }
    
    // Roi et cavalier contre roi
    if ((pieces.knights.w === 1 && pieces.bishops.w.length === 0 && pieces.otherPieces.w === 0 &&
         pieces.knights.b === 0 && pieces.bishops.b.length === 0 && pieces.otherPieces.b === 0) ||
        (pieces.knights.b === 1 && pieces.bishops.b.length === 0 && pieces.otherPieces.b === 0 &&
         pieces.knights.w === 0 && pieces.bishops.w.length === 0 && pieces.otherPieces.w === 0)) {
        return true;
    }
    
    // Roi et fous de même couleur contre roi
    if (pieces.knights.w === 0 && pieces.otherPieces.w === 0 && pieces.bishops.w.length > 0 &&
        pieces.knights.b === 0 && pieces.otherPieces.b === 0 && pieces.bishops.b.length === 0) {
        // Vérifier si tous les fous blancs sont sur des cases de même couleur
        return pieces.bishops.w.every(color => color === pieces.bishops.w[0]);
    }
    
    if (pieces.knights.b === 0 && pieces.otherPieces.b === 0 && pieces.bishops.b.length > 0 &&
        pieces.knights.w === 0 && pieces.otherPieces.w === 0 && pieces.bishops.w.length === 0) {
        // Vérifier si tous les fous noirs sont sur des cases de même couleur
        return pieces.bishops.b.every(color => color === pieces.bishops.b[0]);
    }
    
    // Roi et fous de même couleur des deux côtés
    if (pieces.knights.w === 0 && pieces.otherPieces.w === 0 && pieces.bishops.w.length > 0 &&
        pieces.knights.b === 0 && pieces.otherPieces.b === 0 && pieces.bishops.b.length > 0) {
        // Vérifier si tous les fous blancs sont sur des cases de même couleur
        const allWhiteBishopsOnSameColor = pieces.bishops.w.every(color => color === pieces.bishops.w[0]);
        // Vérifier si tous les fous noirs sont sur des cases de même couleur
        const allBlackBishopsOnSameColor = pieces.bishops.b.every(color => color === pieces.bishops.b[0]);
        // Et vérifier si les fous blancs et noirs sont sur des cases de même couleur
        return allWhiteBishopsOnSameColor && allBlackBishopsOnSameColor && 
               pieces.bishops.w[0] === pieces.bishops.b[0];
    }
    
    return false;
}

function isDrawByFiftyMoveRule() {
    return halfMoveClock >= 100; // 50 coups complets = 100 demi-coups
}

function isDrawByThreefoldRepetition() {
    // Ne pas implémenter pour simplifier
    return false;
}

function isDraw() {
    return isStalemate(currentTurn) || 
           isDrawByInsufficientMaterial() || 
           isDrawByFiftyMoveRule() || 
           isDrawByThreefoldRepetition();
}

function getAllLegalMoves(color) {
    const moves = [];
    
    // Parcourir toutes les pièces de la couleur donnée
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.color === color) {
                const from = getSquareNotation(row, col);
                
                // Vérifier tous les mouvements possibles pour cette pièce
                for (let toRow = 0; toRow < 8; toRow++) {
                    for (let toCol = 0; toCol < 8; toCol++) {
                        const to = getSquareNotation(toRow, toCol);
                        
                        // Sauvegarder l'état actuel du jeu
                        const savedTurn = currentTurn;
                        currentTurn = color; // Temporairement définir le tour
                        
                        // Vérifier si le mouvement est légal
                        const isLegal = isLegalMove(from, to);
                        
                        // Restaurer l'état du jeu
                        currentTurn = savedTurn;
                        
                        if (isLegal) {
                            // Vérifier les promotions pour les pions
                            if (piece.type === PIECES.PAWN && (toRow === 0 || toRow === 7)) {
                                ['q', 'r', 'b', 'n'].forEach(promotion => {
                                    moves.push({ from, to, promotion });
                                });
                            } else {
                                moves.push({ from, to });
                            }
                        }
                    }
                }
            }
        }
    }
    
    return moves;
}

function generateSAN(piece, from, to, capturedPiece, promotion) {
    const fromCoords = getSquareCoordinates(from);
    const toCoords = getSquareCoordinates(to);
    
    // Roque
    if (piece.type === PIECES.KING) {
        if (toCoords.col - fromCoords.col === 2) return "O-O";
        if (fromCoords.col - toCoords.col === 2) return "O-O-O";
    }
    
    let san = "";
    
    // Pièce (sauf pour les pions)
    if (piece.type !== PIECES.PAWN) {
        san += piece.type.toUpperCase();
    }
    
    // Disambiguation (trouver les pièces similaires qui pourraient faire le même mouvement)
    if (piece.type !== PIECES.PAWN && piece.type !== PIECES.KING) {
        const ambiguousPieces = findAmbiguousPieces(piece, to);
        
        if (ambiguousPieces.length > 0) {
            // Déterminer si nous avons besoin de spécifier la colonne, la rangée ou les deux
            let needFile = false;
            let needRank = false;
            
            for (const ambiguous of ambiguousPieces) {
                const ambCoords = getSquareCoordinates(ambiguous);
                if (ambCoords.col === fromCoords.col) needRank = true;
                if (ambCoords.row === fromCoords.row) needFile = true;
            }
            
            if (needFile || (!needFile && !needRank)) san += from.charAt(0);
            if (needRank) san += from.charAt(1);
        }
    }
    
    // Pion qui capture
    if (piece.type === PIECES.PAWN && capturedPiece) {
        san += from.charAt(0);
    }
    
    // Capture
    if (capturedPiece) {
        san += "x";
    }
    
    // Destination
    san += to;
    
    // Promotion
    if (promotion) {
        san += "=" + promotion.toUpperCase();
    }
    
    // Pour simplifier, nous n'ajoutons pas les +/# pour échec/mat ici
    // Mais ces vérifications devraient être faites après le mouvement
    
    return san;
}

function findAmbiguousPieces(piece, targetSquare) {
    const ambiguousPieces = [];
    const targetCoords = getSquareCoordinates(targetSquare);
    
    // Parcourir toutes les pièces du même type et de la même couleur
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const currentPiece = board[row][col];
            if (currentPiece && currentPiece.type === piece.type && currentPiece.color === piece.color) {
                const currentSquare = getSquareNotation(row, col);
                
                // Ignorer la pièce elle-même
                if (currentSquare === getSquareNotation(targetCoords.row, targetCoords.col)) continue;
                
                // Vérifier si cette pièce peut aussi se déplacer vers la case cible
                const savedTurn = currentTurn;
                currentTurn = piece.color;
                const canMove = isLegalMove(currentSquare, targetSquare);
                currentTurn = savedTurn;
                
                if (canMove) {
                    ambiguousPieces.push(currentSquare);
                }
            }
        }
    }
    
    return ambiguousPieces;
}

// =========================================
// INTERFACE UTILISATEUR ET DOM
// =========================================

function createChessboard() {
    const chessboard = document.getElementById('chessboard');
    chessboard.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            const isLight = (row + col) % 2 === 0;
            const position = getSquareNotation(row, col);
            
            square.className = `square ${isLight ? 'light' : 'dark'}`;
            square.dataset.position = position;
            
            chessboard.appendChild(square);
        }
    }
    
    renderBoard();
}

function renderBoard() {
    const chessboard = document.getElementById('chessboard');
    const squares = chessboard.querySelectorAll('.square');
    
    // Nettoyer toutes les cases
    squares.forEach(square => {
        square.innerHTML = '';
        square.classList.remove('highlight', 'last-move', 'check');
    });
    
    // Placer les pièces en fonction de l'état du jeu
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece) {
                const position = getSquareNotation(row, col);
                const square = document.querySelector(`.square[data-position="${position}"]`);
                
                const pieceElement = document.createElement('div');
                pieceElement.className = 'piece';
                pieceElement.dataset.piece = piece.type;
                pieceElement.dataset.color = piece.color;
                pieceElement.textContent = getPieceSymbol(piece.type, piece.color);
                
                // Si l'échiquier est retourné, retourner également les pièces
                if (boardFlipped) {
                    pieceElement.style.transform = 'rotate(180deg)';
                }
                
                square.appendChild(pieceElement);
            }
        }
    }
    
    // Surligner le dernier mouvement
    if (moveHistory.length > 0) {
        const lastMove = moveHistory[moveHistory.length - 1];
        const fromSquare = document.querySelector(`.square[data-position="${lastMove.from}"]`);
        const toSquare = document.querySelector(`.square[data-position="${lastMove.to}"]`);
        
        if (fromSquare) fromSquare.classList.add('last-move');
        if (toSquare) toSquare.classList.add('last-move');
    }
    
    // Surligner le roi en échec
    if (isKingInCheck(currentTurn)) {
        highlightKingInCheck(currentTurn);
    }
}

function highlightKingInCheck(color) {
    // Trouver le roi
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.type === PIECES.KING && piece.color === color) {
                const position = getSquareNotation(row, col);
                const square = document.querySelector(`.square[data-position="${position}"]`);
                if (square) square.classList.add('check');
                return;
            }
        }
    }
}

function setupEventListeners() {
    // Sélection de couleur
    document.getElementById('play-white').addEventListener('click', () => startGame(COLORS.WHITE));
    document.getElementById('play-black').addEventListener('click', () => startGame(COLORS.BLACK));
    
    // Contrôles du jeu
    document.getElementById('undo-btn').addEventListener('click', undoMove);
    document.getElementById('flip-btn').addEventListener('click', flipBoard);
    document.getElementById('reset-btn').addEventListener('click', showNewGameModal);
    document.getElementById('hint-btn').addEventListener('click', showHint);
    
    // Changement de thème
    document.getElementById('theme-switch').addEventListener('click', toggleTheme);
    
    // Sélection de difficulté
    document.querySelectorAll('.difficulty-option').forEach(option => {
        option.addEventListener('click', () => {
            setDifficulty(parseInt(option.dataset.level));
        });
    });
    
    // Modal nouvelle partie
    document.getElementById('confirm-new-game').addEventListener('click', resetGame);
    document.getElementById('cancel-new-game').addEventListener('click', 
        () => document.getElementById('new-game-modal').classList.remove('show'));
    document.querySelector('.modal-close').addEventListener('click',
        () => document.getElementById('new-game-modal').classList.remove('show'));
    
    // Bouton copier PGN
    document.getElementById('copy-pgn').addEventListener('click', copyPGN);
    
    // Ajouter des événements de clic pour les cases (pour la sélection de pièces et les mouvements)
    document.getElementById('chessboard').addEventListener('click', handleBoardClick);
}

function initializeUI() {
    // Vérifier le thème sauvegardé
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('theme-switch').classList.add('dark');
    }
    
    // Mettre à jour l'historique des mouvements
    updateMoveHistory();
    
    // Définir la difficulté active
    setDifficulty(currentDifficulty);
}

function startGame(color) {
    playerColor = color;
    aiColor = color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    gameStarted = true;
    
    // Réinitialiser le jeu
    setupBoard();
    resetClocks();
    
    // Mettre à jour l'interface
    renderBoard();
    updateMoveHistory();
    document.querySelector('.color-selection').style.display = 'none';
    
    // Définir les indicateurs de tour
    updateTurnIndicators();
    
    // Démarrer l'horloge appropriée
    startClock('white');
    
    // Si le joueur est noir, l'IA (Michel) fait le premier mouvement
    if (playerColor === COLORS.BLACK) {
        isPlayerTurn = false;
        updateGameStatus("Michel réfléchit (Blancs)");
        showThinking(true);
        setTimeout(makeAIMove, 1500);
    } else {
        isPlayerTurn = true;
        updateGameStatus("C'est votre tour (Blancs)");
    }
    
    updateCapturedPieces();
}

function getPieceSymbol(type, color) {
    const symbols = {
        'w': {
            'p': '♙', 'n': '♘', 'b': '♗', 'r': '♖', 'q': '♕', 'k': '♔'
        },
        'b': {
            'p': '♟︎', 'n': '♞︎', 'b': '♝︎', 'r': '♜︎', 'q': '♛︎', 'k': '♚︎'
        }
    };
    return symbols[color][type];
}

function handleBoardClick(event) {
    if (!gameStarted || !isPlayerTurn || thinking) return;
    
    // Trouver la case cliquée
    let targetElement = event.target;
    while (targetElement && !targetElement.classList.contains('square')) {
        targetElement = targetElement.parentElement;
    }
    
    if (!targetElement) return;
    
    const position = targetElement.dataset.position;
    
    // Si nous avons une pièce sélectionnée, essayer de la déplacer
    if (selectedSquare) {
        // Essayer de faire le mouvement
        const moveResult = tryPlayerMove(selectedSquare, position);
        
        // Effacer la sélection actuelle
        clearHighlights();
        
        // Si le mouvement n'a pas réussi et que le nouveau clic est sur une pièce du joueur, la sélectionner
        if (!moveResult.success) {
            const piece = getPieceAt(position);
            if (piece && piece.color === playerColor) {
                selectPiece(position);
            }
        }
        
        selectedSquare = null;
    } else {
        // Vérifier si le joueur a cliqué sur sa pièce
        const piece = getPieceAt(position);
        
        if (piece && piece.color === playerColor) {
            selectPiece(position);
        }
    }
}

function getPieceAt(position) {
    const coords = getSquareCoordinates(position);
    return board[coords.row][coords.col];
}

function selectPiece(position) {
    selectedSquare = position;
    
    // Surligner la case sélectionnée
    const square = document.querySelector(`.square[data-position="${position}"]`);
    square.classList.add('highlight');
    
    // Afficher les mouvements possibles
    showLegalMoves(position);
}

function showLegalMoves(position) {
    const piece = getPieceAt(position);
    if (!piece) return;
    
    // Sauvegarder l'état du jeu
    const savedTurn = currentTurn;
    currentTurn = piece.color;
    
    // Parcourir toutes les cases
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const targetPosition = getSquareNotation(row, col);
            
            // Vérifier si le mouvement est légal
            if (isLegalMove(position, targetPosition)) {
                const square = document.querySelector(`.square[data-position="${targetPosition}"]`);
                if (square) {
                    // Mise en évidence différente pour les captures
                    const targetPiece = board[row][col];
                    if (targetPiece !== EMPTY) {
                        const captureMarker = document.createElement('div');
                        captureMarker.className = 'capture-move';
                        square.appendChild(captureMarker);
                    } else {
                        const moveMarker = document.createElement('div');
                        moveMarker.className = 'available-move';
                        square.appendChild(moveMarker);
                    }
                }
            }
        }
    }
    
    // Restaurer l'état du jeu
    currentTurn = savedTurn;
}

function clearHighlights() {
    // Supprimer la mise en évidence des cases
    document.querySelectorAll('.square').forEach(square => {
        square.classList.remove('highlight');
    });
    
    // Supprimer les marqueurs de mouvement
    document.querySelectorAll('.available-move, .capture-move').forEach(marker => {
        marker.remove();
    });
}

function tryPlayerMove(from, to) {
    // Vérifier si c'est un mouvement de promotion
    const piece = getPieceAt(from);
    
    if (!piece) return { success: false };
    
    // Sauvegarde de l'état actuel du jeu
    const savedTurn = currentTurn;
    currentTurn = playerColor;
    
    // Vérifier si le mouvement est légal
    if (!isLegalMove(from, to)) {
        currentTurn = savedTurn;
        return { success: false };
    }
    
    // Restaurer l'état du jeu
    currentTurn = savedTurn;
    
    // Vérifier la promotion de pion
    const toCoords = getSquareCoordinates(to);
    if (piece.type === PIECES.PAWN && (toCoords.row === 0 || toCoords.row === 7)) {
        pendingPromotion = { from, to };
        showPromotionModal();
        return { success: true, promotion: true };
    }
    
    // Faire le mouvement
    const moveResult = movePiece(from, to);
    
    if (moveResult) {
        afterMoveActions();
        return { success: true };
    } else {
        return { success: false };
    }
}

function showPromotionModal() {
    const modal = document.getElementById('promotion-modal');
    const piecesContainer = document.getElementById('promotion-pieces');
    piecesContainer.innerHTML = '';
    
    // Créer les options de pièces pour la promotion
    const pieceTypes = ['q', 'r', 'n', 'b'];
    
    pieceTypes.forEach(type => {
        const pieceElement = document.createElement('div');
        pieceElement.className = 'promotion-piece';
        pieceElement.textContent = getPieceSymbol(type, playerColor);
        pieceElement.addEventListener('click', () => {
            completePromotion(type);
        });
        
        piecesContainer.appendChild(pieceElement);
    });
    
    modal.classList.add('show');
}

function completePromotion(pieceType) {
    document.getElementById('promotion-modal').classList.remove('show');
    
    if (pendingPromotion) {
        // Faire le mouvement avec promotion
        const moveResult = movePiece(pendingPromotion.from, pendingPromotion.to, pieceType);
        
        if (moveResult) {
            afterMoveActions();
        } else {
            showToast("Mouvement invalide", "danger");
        }
        
        pendingPromotion = null;
    }
}

function afterMoveActions() {
    // Mettre à jour le plateau
    renderBoard();
    
    // Mettre à jour l'historique des mouvements
    updateMoveHistory();
    
    // Mettre à jour les pièces capturées
    updateCapturedPieces();
    
    // Changer l'horloge active
    const activeColor = currentTurn === COLORS.WHITE ? 'white' : 'black';
    const inactiveColor = currentTurn === COLORS.WHITE ? 'black' : 'white';
    stopClock(inactiveColor);
    startClock(activeColor);
    
    // Vérifier l'état du jeu
    checkGameStatus();
    
    // Changer de tour si le jeu n'est pas terminé
    const gameOver = isCheckmate(currentTurn) || isDraw();
    
    if (!gameOver) {
        isPlayerTurn = currentTurn === playerColor;
        updateTurnIndicators();
        
        // Si c'est le tour de l'IA, faire un mouvement
        if (!isPlayerTurn) {
            showThinking(true);
            setTimeout(makeAIMove, 1500);
        }
    }
}

function makeAIMove() {
    if (isCheckmate(aiColor) || isDraw()) {
        showThinking(false);
        return;
    }
    
    let move;
    
    // Sélectionner un mouvement en fonction de la difficulté
    switch (currentDifficulty) {
        case 1: // Facile - 400 ELO
            move = getEasyMove();
            break;
        case 2: // Moyen - 1200 ELO
            move = getMediumMove();
            break;
        case 3: // Difficile - 2000 ELO
            move = getHardMove();
            break;
        default:
            move = getMediumMove();
    }
    
    // Effectuer le mouvement sélectionné
    if (move) {
        const moveResult = movePiece(move.from, move.to, move.promotion);
        
        // Mettre à jour l'interface
        showThinking(false);
        
        if (moveResult) {
            afterMoveActions();
        } else {
            // En cas d'erreur, essayer un mouvement aléatoire
            const allMoves = getAllLegalMoves(aiColor);
            if (allMoves.length > 0) {
                const randomMove = allMoves[Math.floor(Math.random() * allMoves.length)];
                movePiece(randomMove.from, randomMove.to, randomMove.promotion);
                afterMoveActions();
            } else {
                // Aucun mouvement légal, vérifier l'état du jeu
                checkGameStatus();
            }
        }
    } else {
        // Aucun mouvement disponible
        showThinking(false);
        checkGameStatus();
    }
}

function getEasyMove() {
    // Niveau 400 ELO (très faible)
    const allMoves = getAllLegalMoves(aiColor);
    if (allMoves.length === 0) return null;
    
    // 70% mouvements aléatoires, 30% pondérés
    if (Math.random() < 0.7) {
        // Faire un mouvement complètement aléatoire
        return allMoves[Math.floor(Math.random() * allMoves.length)];
    } else {
        return getWeightedMove(0.4);
    }
}

function getMediumMove() {
    // Niveau 1200 ELO (joueur occasionnel)
    const allMoves = getAllLegalMoves(aiColor);
    if (allMoves.length === 0) return null;
    
    // 30% aléatoire, 70% pondéré
    if (Math.random() < 0.3) {
        return allMoves[Math.floor(Math.random() * allMoves.length)];
    } else {
        return getWeightedMove(0.7);
    }
}

function getHardMove() {
    // Niveau 2000 ELO (joueur fort)
    // Utilise un algorithme minimax simplifié
    return findBestMove(3); // Profondeur de recherche de 3
}

function getWeightedMove(captureWeight) {
    const allMoves = getAllLegalMoves(aiColor);
    if (allMoves.length === 0) return null;
    
    // Mouvements prioritaires
    const checkMoves = [];
    const capturingMoves = [];
    const normalMoves = [];
    
    // Trier les mouvements
    for (const move of allMoves) {
        // Sauvegarder l'état du jeu
        const savedBoard = cloneBoard();
        const savedTurn = currentTurn;
        
        // Faire le mouvement temporairement
        movePiece(move.from, move.to, move.promotion);
        
        // Vérifier si le joueur est en échec après ce mouvement
        const putsInCheck = isKingInCheck(playerColor);
        
        // Si c'est un échec et mat, retourner ce mouvement immédiatement
        if (isCheckmate(playerColor)) {
            // Restaurer l'état du jeu
            board = savedBoard;
            currentTurn = savedTurn;
            return move;
        }
        
        // Restaurer l'état du jeu
        board = savedBoard;
        currentTurn = savedTurn;
        
        // Vérifier si c'est une capture
        const targetPiece = getPieceAt(move.to);
        if (targetPiece !== EMPTY) {
            capturingMoves.push({ move, value: getPieceValue(targetPiece.type) });
        } else if (putsInCheck) {
            checkMoves.push(move);
        } else {
            normalMoves.push(move);
        }
    }
    
    // Prioriser les mouvements d'échec
    if (checkMoves.length > 0 && Math.random() < 0.8) {
        return checkMoves[Math.floor(Math.random() * checkMoves.length)];
    }
    
    // Prioriser les captures
    if (capturingMoves.length > 0 && Math.random() < captureWeight) {
        // Évaluer les captures par gain matériel
        capturingMoves.sort((a, b) => b.value - a.value);
        return capturingMoves[0].move; // Meilleure capture
    }
    
    // Sinon, faire un mouvement aléatoire
    return normalMoves.length > 0 
        ? normalMoves[Math.floor(Math.random() * normalMoves.length)]
        : allMoves[Math.floor(Math.random() * allMoves.length)];
}

function getPieceValue(pieceType) {
    const values = {
        'p': 1,
        'n': 3,
        'b': 3,
        'r': 5,
        'q': 9,
        'k': 0
    };
    return values[pieceType] || 0;
}

function findBestMove(depth) {
    let bestMove = null;
    let bestValue = -Infinity;
    const allMoves = getAllLegalMoves(aiColor);
    
    if (allMoves.length === 0) return null;
    
    // Évaluer chaque mouvement
    for (const move of allMoves) {
        // Sauvegarder l'état du jeu
        const savedBoard = cloneBoard();
        const savedTurn = currentTurn;
        
        // Faire le mouvement
        movePiece(move.from, move.to, move.promotion);
        
        // Calculer la valeur du mouvement avec minimax
        const value = -minimax(depth - 1, -Infinity, Infinity, false);
        
        // Restaurer l'état du jeu
        board = savedBoard;
        currentTurn = savedTurn;
        
        if (value > bestValue) {
            bestValue = value;
            bestMove = move;
        }
    }
    
    return bestMove;
}

function minimax(depth, alpha, beta, isMaximizing) {
    // Cas de base : évaluation au nœud feuille ou fin de jeu
    if (depth === 0 || isCheckmate(currentTurn) || isDraw()) {
        return evaluateBoard();
    }
    
    const color = isMaximizing ? aiColor : playerColor;
    const allMoves = getAllLegalMoves(color);
    
    if (allMoves.length === 0) {
        return evaluateBoard();
    }
    
    if (isMaximizing) {
        let maxValue = -Infinity;
        
        for (const move of allMoves) {
            // Sauvegarder l'état du jeu
            const savedBoard = cloneBoard();
            const savedTurn = currentTurn;
            
            // Faire le mouvement
            movePiece(move.from, move.to, move.promotion);
            
            // Évaluer récursivement
            const value = minimax(depth - 1, alpha, beta, false);
            
            // Restaurer l'état du jeu
            board = savedBoard;
            currentTurn = savedTurn;
            
            maxValue = Math.max(maxValue, value);
            alpha = Math.max(alpha, value);
            
            // Élagage alpha-beta
            if (beta <= alpha) break;
        }
        
        return maxValue;
    } else {
        let minValue = Infinity;
        
        for (const move of allMoves) {
            // Sauvegarder l'état du jeu
            const savedBoard = cloneBoard();
            const savedTurn = currentTurn;
            
            // Faire le mouvement
            movePiece(move.from, move.to, move.promotion);
            
            // Évaluer récursivement
            const value = minimax(depth - 1, alpha, beta, true);
            
            // Restaurer l'état du jeu
            board = savedBoard;
            currentTurn = savedTurn;
            
            minValue = Math.min(minValue, value);
            beta = Math.min(beta, value);
            
            // Élagage alpha-beta
            if (beta <= alpha) break;
        }
        
        return minValue;
    }
}

function evaluateBoard() {
    let value = 0;
    
    // Vérifier l'échec et mat
    if (isCheckmate(aiColor)) return -9999;
    if (isCheckmate(playerColor)) return 9999;
    
    // Vérifier le pat
    if (isDraw()) return 0;
    
    // Évaluer le matériel
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece !== EMPTY) {
                const pieceValue = getPieceValue(piece.type) * (piece.color === aiColor ? 1 : -1);
                value += pieceValue;
                
                // Évaluation de position (simplifiée)
                value += evaluatePiecePosition(piece, row, col) * (piece.color === aiColor ? 0.1 : -0.1);
            }
        }
    }
    
    // Ajouter un petit facteur aléatoire pour éviter un jeu prévisible
    value += (Math.random() * 0.2) - 0.1;
    
    return value;
}

function evaluatePiecePosition(piece, row, col) {
    // Évaluation simple de position : préférer les cases centrales
    const centerValue = 8 - (Math.abs(3.5 - row) + Math.abs(3.5 - col));
    
    // Pour les pions, avancer est bon
    if (piece.type === PIECES.PAWN) {
        const advancementValue = piece.color === COLORS.WHITE ? (7 - row) : row;
        return centerValue + advancementValue;
    }
    
    return centerValue;
}

function cloneBoard() {
    // Créer une copie profonde du plateau
    return JSON.parse(JSON.stringify(board));
}

function showThinking(show) {
    thinking = show;
    const thinkingElement = document.getElementById('thinking-indicator');
    
    if (show) {
        thinkingElement.classList.add('active');
    } else {
        thinkingElement.classList.remove('active');
    }
}

function updateMoveHistory() {
    const tableBody = document.querySelector('#move-list tbody');
    tableBody.innerHTML = '';
    
    for (let i = 0; i < moveHistory.length; i += 2) {
        const row = document.createElement('tr');
        const moveNumber = Math.floor(i / 2) + 1;
        
        // Cellule numéro de coup
        const numberCell = document.createElement('td');
        numberCell.textContent = moveNumber;
        row.appendChild(numberCell);
        
        // Coup des blancs
        const whiteCell = document.createElement('td');
        whiteCell.textContent = moveHistory[i].san;
        whiteCell.className = 'move-white';
        row.appendChild(whiteCell);
        
        // Coup des noirs (s'il existe)
        const blackCell = document.createElement('td');
        if (moveHistory[i + 1]) {
            blackCell.textContent = moveHistory[i + 1].san;
            blackCell.className = 'move-black';
        }
        row.appendChild(blackCell);
        
        // Surligner la position actuelle
        if (i === moveHistory.length - 1 || i + 1 === moveHistory.length - 1) {
            row.classList.add('current-move');
        }
        
        tableBody.appendChild(row);
    }
    
    // Défiler vers le bas de l'historique des mouvements
    const moveHistoryContainer = document.querySelector('.move-history');
    moveHistoryContainer.scrollTop = moveHistoryContainer.scrollHeight;
}

function updateCapturedPieces() {
    const capturedByUser = document.getElementById('captured-by-user');
    const capturedByMichel = document.getElementById('captured-by-michel');
    
    capturedByUser.innerHTML = '';
    capturedByMichel.innerHTML = '';
    
    // Comptes de pièces (position de départ)
    const startingPieces = {
        'p': 8, 'n': 2, 'b': 2, 'r': 2, 'q': 1, 'k': 1
    };
    
    // Pièces actuelles sur le plateau
    const currentPieces = {
        'w': { 'p': 0, 'n': 0, 'b': 0, 'r': 0, 'q': 0, 'k': 0 },
        'b': { 'p': 0, 'n': 0, 'b': 0, 'r': 0, 'q': 0, 'k': 0 }
    };
    
    // Compter les pièces actuellement sur le plateau
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece !== EMPTY) {
                currentPieces[piece.color][piece.type]++;
            }
        }
    }
    
    // Calculer les pièces capturées
    const capturedByWhite = {};
    const capturedByBlack = {};
    
    for (const pieceType in startingPieces) {
        const whiteCaptured = startingPieces[pieceType] - currentPieces['b'][pieceType];
        const blackCaptured = startingPieces[pieceType] - currentPieces['w'][pieceType];
        
        capturedByWhite[pieceType] = whiteCaptured;
        capturedByBlack[pieceType] = blackCaptured;
    }
    
    // Afficher les pièces capturées
    const displayCaptured = (pieces, color, element) => {
        for (const pieceType in pieces) {
            for (let i = 0; i < pieces[pieceType]; i++) {
                const pieceElement = document.createElement('span');
                pieceElement.className = 'captured-piece';
                pieceElement.textContent = getPieceSymbol(pieceType, color);
                element.appendChild(pieceElement);
            }
        }
    };
    
    if (playerColor === COLORS.WHITE) {
        displayCaptured(capturedByWhite, COLORS.BLACK, capturedByUser);
        displayCaptured(capturedByBlack, COLORS.WHITE, capturedByMichel);
    } else {
        displayCaptured(capturedByBlack, COLORS.WHITE, capturedByUser);
        displayCaptured(capturedByWhite, COLORS.BLACK, capturedByMichel);
    }
}

function checkGameStatus() {
    if (isCheckmate(currentTurn)) {
        const winner = currentTurn === COLORS.WHITE ? 'Noirs' : 'Blancs';
        updateGameStatus(`Échec et mat! Les ${winner} gagnent.`, 'checkmate');
        showToast(`Échec et mat! Les ${winner} gagnent.`, 'success');
        stopClocks();
    } else if (isDraw()) {
        let reason = "Partie nulle";
        
        if (isStalemate(currentTurn)) {
            reason = "Partie nulle par pat";
        } else if (isDrawByInsufficientMaterial()) {
            reason = "Partie nulle par matériel insuffisant";
        } else if (isDrawByFiftyMoveRule()) {
            reason = "Partie nulle par la règle des 50 coups";
        }
        
        updateGameStatus(reason, 'stalemate');
        showToast(reason, 'warning');
        stopClocks();
    } else if (isKingInCheck(currentTurn)) {
        const checked = currentTurn === COLORS.WHITE ? 'Blancs' : 'Noirs';
        updateGameStatus(`Échec aux ${checked}`, 'check');
    } else {
        const turn = currentTurn === COLORS.WHITE ? 'Blancs' : 'Noirs';
        const playerTurnText = isPlayerTurn ? "C'est votre tour" : "Michel réfléchit";
        updateGameStatus(`${playerTurnText} (${turn})`);
    }
}

function updateGameStatus(message, className = '') {
    const statusElement = document.getElementById('game-status');
    statusElement.textContent = message;
    statusElement.className = 'game-status';
    
    if (className) {
        statusElement.classList.add(className);
    }
}

function updateTurnIndicators() {
    const userIndicator = document.getElementById('user-turn');
    const michelIndicator = document.getElementById('michel-turn');
    
    // Mettre à jour les indicateurs de tour en fonction de qui doit jouer
    userIndicator.style.opacity = isPlayerTurn ? '1' : '0';
    michelIndicator.style.opacity = isPlayerTurn ? '0' : '1';
    
    // Mettre à jour les affichages d'horloge
    const playerClock = document.getElementById(playerColor === COLORS.WHITE ? 'user-clock' : 'michel-clock');
    const aiClock = document.getElementById(aiColor === COLORS.WHITE ? 'user-clock' : 'michel-clock');
    
    playerClock.classList.toggle('active-clock', currentTurn === playerColor);
    aiClock.classList.toggle('active-clock', currentTurn === aiColor);
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function undoMove() {
    if (!gameStarted || moveHistory.length === 0) return;
    
    // Si l'IA vient de jouer, annuler à la fois le coup de l'IA et celui du joueur
    if (!isPlayerTurn) {
        // Annuler le dernier coup (IA)
        if (moveHistory.length > 0) {
            undoLastMove();
        }
        
        // Annuler le coup précédent (joueur)
        if (moveHistory.length > 0) {
            undoLastMove();
        }
    } else {
        // Si c'est au tour du joueur, simplement annuler le dernier coup
        undoLastMove();
    }
    
    // Réinitialiser la sélection
    selectedSquare = null;
    clearHighlights();
    
    // Mettre à jour l'interface
    renderBoard();
    updateMoveHistory();
    updateCapturedPieces();
    
    // Définir le tour du joueur
    isPlayerTurn = true;
    updateTurnIndicators();
    
    // Mettre à jour l'état du jeu
    checkGameStatus();
    
    // Redémarrer l'horloge pour le joueur actif
    resetClocks();
    startClock(currentTurn === COLORS.WHITE ? 'white' : 'black');
}

function undoLastMove() {
    if (moveHistory.length === 0) return;
    
    // Récupérer le dernier mouvement
    const lastMove = moveHistory.pop();
    
    // Replacer la pièce à sa position d'origine
    const { row: toRow, col: toCol } = getSquareCoordinates(lastMove.to);
    const { row: fromRow, col: fromCol } = getSquareCoordinates(lastMove.from);
    
    // Récupérer la pièce actuelle (peut être une promotion)
    let piece = board[toRow][toCol];
    
    // Si c'était une promotion, restaurer le pion
    if (lastMove.promotion) {
        piece = { type: PIECES.PAWN, color: piece.color };
    }
    
    // Remettre la pièce à sa position d'origine
    board[fromRow][fromCol] = piece;
    
    // Restaurer la pièce capturée, le cas échéant
    if (lastMove.captured) {
        board[toRow][toCol] = lastMove.captured;
    } else {
        board[toRow][toCol] = EMPTY;
    }
    
    // Restaurer la pièce capturée en passant, le cas échéant
    if (lastMove.enPassantCapture) {
        const { row, col } = getSquareCoordinates(lastMove.enPassantCapture);
        board[row][col] = { type: PIECES.PAWN, color: currentTurn };
    }
    
    // Restaurer le roque
    if (lastMove.castling) {
        const kingRow = piece.color === COLORS.WHITE ? 7 : 0;
        
        if (lastMove.to === 'g1' || lastMove.to === 'g8') {
            // Roque côté roi
            board[kingRow][7] = board[kingRow][5]; // Remettre la tour à sa place
            board[kingRow][5] = EMPTY;
        } else if (lastMove.to === 'c1' || lastMove.to === 'c8') {
            // Roque côté reine
            board[kingRow][0] = board[kingRow][3]; // Remettre la tour à sa place
            board[kingRow][3] = EMPTY;
        }
    }
    
    // Inverser le tour
    currentTurn = currentTurn === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    
    // Décrémenter le compteur de coups complets si nécessaire
    if (piece.color === COLORS.BLACK) {
        fullMoveNumber--;
    }
}

function flipBoard() {
    boardFlipped = !boardFlipped;
    const chessboard = document.getElementById('chessboard');
    chessboard.classList.toggle('flipped');
    
    // Retourner également les pièces
    document.querySelectorAll('.piece').forEach(piece => {
        piece.style.transform = boardFlipped ? 'rotate(180deg)' : '';
    });
}

function setDifficulty(level) {
    currentDifficulty = level;
    
    // Mettre à jour l'interface
    document.querySelectorAll('.difficulty-option').forEach(option => {
        option.classList.toggle('selected', parseInt(option.dataset.level) === level);
    });
    
    // Afficher un toast de difficulté
    const difficultyLabels = {
        1: 'Facile (400 Elo)',
        2: 'Moyen (1200 Elo)',
        3: 'Difficile (2000 Elo)'
    };
    
    showToast(`Difficulté: ${difficultyLabels[level]}`, 'info');
}

function toggleTheme() {
    const themeSwitch = document.getElementById('theme-switch');
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    themeSwitch.classList.toggle('dark', newTheme === 'dark');
    
    // Sauvegarder la préférence
    localStorage.setItem('theme', newTheme);
}

function showNewGameModal() {
    document.getElementById('new-game-modal').classList.add('show');
}

function resetGame() {
    // Masquer le modal
    document.getElementById('new-game-modal').classList.remove('show');
    
    // Réinitialiser le jeu
    setupBoard();
    selectedSquare = null;
    clearHighlights();
    gameStarted = false;
    
    // Réinitialiser l'interface
    renderBoard();
    updateMoveHistory();
    document.querySelector('.color-selection').style.display = 'flex';
    updateGameStatus("En attente du choix de couleur...");
    
    // Réinitialiser les indicateurs de tour
    document.getElementById('user-turn').style.opacity = '0';
    document.getElementById('michel-turn').style.opacity = '0';
    
    // Arrêter et réinitialiser les horloges
    stopClocks();
    resetClocks();
    
    // Effacer les pièces capturées
    updateCapturedPieces();
}

function showHint() {
    if (!gameStarted || !isPlayerTurn || isCheckmate(currentTurn) || isDraw()) return;
    
    // Obtenir un mouvement suggéré en utilisant l'IA de difficulté moyenne
    const hintMove = findBestMove(2);
    
    if (hintMove) {
        // Surligner les cases de départ et d'arrivée
        const fromSquare = document.querySelector(`.square[data-position="${hintMove.from}"]`);
        const toSquare = document.querySelector(`.square[data-position="${hintMove.to}"]`);
        
        if (fromSquare && toSquare) {
            // Effacer les surlignages existants
            clearHighlights();
            
            // Surligner le mouvement suggéré
            fromSquare.classList.add('highlight');
            
            const moveMarker = document.createElement('div');
            moveMarker.className = 'available-move';
            toSquare.appendChild(moveMarker);
            
            // Afficher un toast avec le mouvement en notation algébrique
            showToast(`Conseil: ${hintMove.from} → ${hintMove.to}`, 'info');
            
            // Effacer le conseil après 2 secondes
            setTimeout(() => {
                clearHighlights();
            }, 2000);
        }
    }
}

function copyPGN() {
    // Générer le PGN à partir de l'historique des mouvements
    let pgn = generatePGN();
    
    navigator.clipboard.writeText(pgn)
        .then(() => {
            showToast('PGN copié dans le presse-papier', 'success');
        })
        .catch(err => {
            showToast('Erreur lors de la copie du PGN', 'danger');
        });
}

function generatePGN() {
    // En-têtes PGN (simplifiés)
    let pgn = '[Event "Partie en ligne"]\n';
    pgn += '[Site "Échecs contre Michel"]\n';
    pgn += '[Date "' + new Date().toISOString().split('T')[0] + '"]\n';
    pgn += '[White "' + (playerColor === COLORS.WHITE ? 'Utilisateur' : 'Michel (IA)') + '"]\n';
    pgn += '[Black "' + (playerColor === COLORS.BLACK ? 'Utilisateur' : 'Michel (IA)') + '"]\n';
    pgn += '[Result "*"]\n\n';
    
    // Corps du PGN
    let moveText = '';
    for (let i = 0; i < moveHistory.length; i++) {
        if (i % 2 === 0) {
            moveText += Math.floor(i / 2) + 1 + '. ';
        }
        moveText += moveHistory[i].san + ' ';
    }
    
    return pgn + moveText.trim() + ' *';
}

// Fonctions d'horloge
function startClock(color) {
    stopClock(color);
    clocks[color].interval = setInterval(() => {
        clocks[color].time++;
        updateClockDisplay(color);
    }, 1000);
}

function stopClock(color) {
    if (clocks[color].interval) {
        clearInterval(clocks[color].interval);
        clocks[color].interval = null;
    }
}

function stopClocks() {
    stopClock('white');
    stopClock('black');
}

function resetClocks() {
    stopClocks();
    clocks.white.time = 0;
    clocks.black.time = 0;
    updateClockDisplay('white');
    updateClockDisplay('black');
}

function updateClockDisplay(color) {
    const time = clocks[color].time;
    const minutes = Math.floor(time / 60).toString().padStart(2, '0');
    const seconds = (time % 60).toString().padStart(2, '0');
    
    const displayFormat = `${minutes}:${seconds}`;
    
    const element = document.getElementById(
        color === 'white' ? 
        (playerColor === COLORS.WHITE ? 'user-clock' : 'michel-clock') : 
        (playerColor === COLORS.BLACK ? 'user-clock' : 'michel-clock')
    );
    
    if (element) {
        element.textContent = displayFormat;
    }
}

// =========================================
// FONCTIONS UTILITAIRES
// =========================================

function getSquareCoordinates(squareNotation) {
    const col = squareNotation.charCodeAt(0) - 'a'.charCodeAt(0);
    const row = 8 - parseInt(squareNotation.charAt(1));
    return { row, col };
}

function getSquareNotation(row, col) {
    const file = String.fromCharCode('a'.charCodeAt(0) + col);
    const rank = 8 - row;
    return file + rank;
}
let gameHasStarted = false;
var board = null;
var game = new Chess();
var $status = $("#status");
var $pgn = $("#pgn");
let gameOver = false;

var pieceUrls = {
  wQ: "https://i.ibb.co/F4B94fn/wq.png",
  wR: "https://i.ibb.co/J50pt4b/wr.png",
  wP: "https://i.ibb.co/McrgNVt/wp.png",
  wN: "https://i.ibb.co/xXXV0zj/wn.png",
  wK: "https://i.ibb.co/tcLhwCb/wk.png",
  wB: "https://i.ibb.co/W6MQdGM/wb.png",
  bR: "https://i.ibb.co/6scnpsX/br.png",
  bQ: "https://i.ibb.co/QQG6GZw/bq.png",
  bP: "https://i.ibb.co/Pg15r7B/bp.png",
  bN: "https://i.ibb.co/CzxSfx8/bn.png",
  bK: "https://i.ibb.co/DKSRBMC/bk.png",
};

// Fallback URL
var fallbackPieceUrl = "https://i.ibb.co/PCHzSzK/bb.png";

function getPieceThemeUrl(piece) {
  return pieceUrls[piece] || fallbackPieceUrl;
}

function onDragStart(source, piece, position, orientation) {
  // do not pick up pieces if the game is over
  if (game.game_over()) return false;
  if (!gameHasStarted) return false;
  if (gameOver) return false;

  if (
    (playerColor === "black" && piece.search(/^w/) !== -1) ||
    (playerColor === "white" && piece.search(/^b/) !== -1)
  ) {
    return false;
  }

  // only pick up pieces for the side to move
  if (
    (game.turn() === "w" && piece.search(/^b/) !== -1) ||
    (game.turn() === "b" && piece.search(/^w/) !== -1)
  ) {
    return false;
  }
}

function onDrop(source, target) {
  let theMove = {
    from: source,
    to: target,
    promotion: "q", // NOTE: always promote to a queen for simplicity
  };
  // see if the move is legal
  var move = game.move(theMove);

  // illegal move
  if (move === null) return "snapback";

  socket.emit("move", theMove);
  updateStatus();
}

socket.on("newMove", function (move) {
  game.move(move);
  board.position(game.fen());
  updateStatus();
});

// update the board position after the piece snap
// for castling, en passant, pawn promotion
function onSnapEnd() {
  board.position(game.fen());
}

function updateStatus() {
  var status = "";

  var moveColor = "White";
  if (game.turn() === "b") {
    moveColor = "Black";
  }

  // checkmate?
  if (game.in_checkmate()) {
    status = "Game over, " + moveColor + " is in checkmate.";
  }

  // draw?
  else if (game.in_draw()) {
    status = "Game over, drawn position";
  } else if (gameOver) {
    status = "Opponent disconnected, you win!";
  } else if (!gameHasStarted) {
    status = "Waiting for black to join";
  }

  // game still on
  else {
    status = moveColor + " to move";

    // check?
    if (game.in_check()) {
      status += ", " + moveColor + " is in check";
    }
  }

  $status.html(status);
  $pgn.html(game.pgn());
}

function pieceTheme(piece) {
  return getPieceThemeUrl(piece);
}

var config = {
  draggable: true,
  position: "start",
  onDragStart: onDragStart,
  onDrop: onDrop,
  onSnapEnd: onSnapEnd,
  pieceTheme: pieceTheme,
  // Ensure touch support is enabled
  touchStart: true, // Enable touch start support
  touchDrag: true, // Enable touch drag support
};

// Initialize the board
board = Chessboard("myBoard", config);

if (playerColor === "black") {
  board.flip();
}

updateStatus();

var urlParams = new URLSearchParams(window.location.search);
if (urlParams.get("code")) {
  socket.emit("joinGame", {
    code: urlParams.get("code"),
  });
}

socket.on("startGame", function () {
  gameHasStarted = true;
  updateStatus();
});

socket.on("gameOverDisconnect", function () {
  gameOver = true;
  updateStatus();
});

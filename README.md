# Chess Against Michel

Chess Against Michel is a simple, interactive chess game that lets you challenge an AI opponent named Michel. The project offers an engaging experience with smooth animations, responsive design, and user-friendly controls.

Play : 

## Features

- **Play as White or Black:** Choose your side and start playing immediately.  
- **Interactive Chessboard:** Enjoy smooth animations and dynamic board interactions.  
- **Move History & Undo:** Track every move with a detailed move history and undo functionality.  
- **Theme Switching:** Easily toggle between light and dark modes for comfortable play on any device.  
- **Responsive Design:** Optimized for various screen sizes with a modern, clean layout.

## How to Play

1. **Select Your Color:** Click on "Play as White" or "Play as Black" to choose your side.
2. **Make a Move:** Click on a piece and then on the destination square to move it.
3. **Automatic Turn Switching:** The game handles move validation and alternates turns between you and Michel.
4. **Undo Moves:** Use the "Undo Move" button to revert your last action if needed.
5. **AI Response:** If you choose to play as black, the AI will make the first move automatically.

## Known Issues & Bugs

- **Chessboard Rotation Animation:**  
  The current rotation animation is visually appealing but problematic. Instead of simply reversing the board’s orientation, it should swap the positions of the white and black pieces. Right now, the rotation inverts the pieces, making them appear upside down, which is illogical and confusing.

- **Redundant Flip Board Button:**  
  The "Flip Board" button is unnecessary since the board orientation is automatically adjusted when you choose your color. It is recommended to remove this button to streamline the user experience.

- **Captured Pieces Display Issue:**  
  When either the user or Michel captures an opponent's piece, the piece is not added to the correct captured pieces list. For example, if Michel captures a piece from the user, the piece erroneously appears in the user's captured list.

- **Excessive Empty Space on the Right:**  
  The layout has too much unused space on the right side, where player names, clocks, and game information are displayed. This visual imbalance needs to be addressed for a cleaner and more efficient interface.

## Contributing

Contributions are welcome! If you’d like to help improve Chess Against Michel, please fork the repository and submit a pull request with your enhancements or bug fixes.

## Buy Me a Coffee

If you enjoy the game and would like to support the project, please consider buying me a coffee:

[Buy Me a Coffee](https://buymeacoffee.com/sniteur)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
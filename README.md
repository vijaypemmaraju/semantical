# Semantical

[Play the game](https://semantical.fun)

Semantical is an AI-powered word association game that challenges players to find semantic connections between words. The game utilizes Claude Haiku and Neo4j to create an interactive graph-based exploration of semantic relationships.

## How to Play

Semantical has three game modes:

### Daily Mode

- A new puzzle is generated each day
- Starting from the given word, find your way to the target word through semantically related words
- Track your daily streak and compete with friends

### Unlimited Mode

- Play as many puzzles as you want
- Great for practice and exploration

### Bingo Mode

- Start from a given word and try to reach multiple target words
- A more challenging experience for word association experts

## Game Mechanics

1. You start with a single word node in the graph
2. Click on a word to reveal semantically related words
3. Continue exploring connections until you find the path to the target word(s)
4. Win by discovering all target words with the fewest clicks

The game visualizes semantic connections as a beautiful, interactive graph that grows as you explore more words.

## Technology Stack

- **Frontend**: Astro, React, Tailwind CSS, Framer Motion
- **Visualization**: Force Graph (D3-based)
- **Database**: Neo4j for storing word relationships
- **AI**: Claude Haiku for generating semantic word associations
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js (v18 or later) - use the included .nvmrc file with `nvm use`
- Neo4j database instance
- Anthropic API key (for Claude Haiku)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/semantical.git
cd semantical
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following:

```
ANTHROPIC_API_KEY=your_anthropic_api_key
NEO4J_PASSWORD=your_neo4j_password
```

4. Start the development server:

```bash
npm run dev
```

5. Open your browser and navigate to `http://localhost:4321`

## Building for Production

To create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Deployment

The project is configured for deployment on Vercel. Simply connect your GitHub repository to Vercel and set the required environment variables.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Astro](https://astro.build)
- Graph visualization powered by [Force Graph](https://github.com/vasturiano/force-graph)
- Word associations powered by [Claude](https://www.anthropic.com/claude)
- Data storage with [Neo4j](https://neo4j.com)

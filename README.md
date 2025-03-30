# effect-mcp

**Status**: *Under Development*

`effect-mcp` is a TypeScript library designed to implement Model Context Protocol (MCP) transports using the Effect framework. Our mission is to develop a robust and flexible MCP transport library with a clear, extensible architecture and practical documentation.

## Project Vision

We aim to provide:

- **Transport Agnostic Architecture**: Allow developers to define MCP servers independent of the underlying transport.
- **Comprehensive Documentation**: Clear guidelines and examples for users and contributors.

## Transport Design

`effect-mcp` will enable creating transport-agnostic MCP servers. Developers will be able to plug in different transport mechanisms based on their application's needs:

- **StdioTransport**: Can be integrated into an existing `@effect/cli` application
- **SseTransport**: Can be added to an existing HTTP API.

## Current Status

The project currently demonstrates an HTTP-based SSE Transport with a working prototype that handles requests using a hardcoded set of tools, prompts, and resources.

We are actively working on:

- Replacing hardcoded logic with modular components:
  - Integrating with `AiToolkit` from `@effect/ai`
  - Building `PromptKit` and `ResourceKit` abstractions
- Expanding protocol coverage to support all MCP methods from the [Model Context Protocol Specification (2025-03-26)](https://spec.modelcontextprotocol.io/specification/2025-03-26/)

## Getting Started

While the project is still in development, you can set up the development environment to explore and contribute:

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/jpowersdev/effect-mcp.git
   ```
2. **Navigate to the Project Directory**:
   ```bash
   cd effect-mcp
   ```
3. **Install Dependencies**:
   ```bash
   pnpm install
   ```

## Contributing

We welcome contributions! Here's how you can get involved:

1. **Review Open Issues**: Check the [issue tracker](https://github.com/jpowersdev/effect-mcp/issues) for tasks and feature requests.
2. **Fork the Repository**: Click the 'Fork' button at the top right of the repository page.
3. **Create a New Branch**: Use a descriptive name for your branch.
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Make Your Changes**: Implement your feature or fix.
5. **Commit Your Changes**: Write clear, concise commit messages.
   ```bash
   git commit -m 'Add feature: your feature description'
   ```
6. **Push to Your Fork**:
   ```bash
   git push origin feature/your-feature-name
   ```
7. **Submit a Pull Request**: Navigate to the original repository and create a pull request from your forked branch.

**Note**: Please adhere to the project's coding standards and include relevant tests for your contributions.

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact

For questions or further information, please open an issue on the [issue tracker](https://github.com/jpowersdev/effect-mcp/issues).


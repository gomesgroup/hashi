# Contributing to Hashi

Thank you for considering contributing to Hashi! This document outlines the process for contributing to the project and guidelines to follow.

## Development Process

1. **Fork the Repository**: Fork the repository to your GitHub account.

2. **Create a Branch**: Create a branch for your changes.
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**: Implement your changes following the code style guidelines.

4. **Write Tests**: Add tests for your changes to ensure they work as expected.

5. **Run Linting and Tests**: Make sure all tests pass and code meets the linting standards.
   ```bash
   npm run lint
   npm test
   ```

6. **Document Your Changes**: Update or add documentation as necessary.

7. **Commit Your Changes**: Use clear, descriptive commit messages.
   ```bash
   git commit -m "Add feature: brief description of changes"
   ```

8. **Push to Your Branch**: Push your changes to your fork.
   ```bash
   git push origin feature/your-feature-name
   ```

9. **Create a Pull Request**: Submit a pull request from your branch to the main repository.

## Code Style Guidelines

### General Guidelines
- Use TypeScript for all code
- Follow the existing project structure
- Keep functions small and focused on a single task
- Add comments to explain complex logic
- Write descriptive variable and function names

### TypeScript Guidelines
- Use explicit typing whenever possible
- Define interfaces for complex objects
- Use enums for fixed sets of values
- Use async/await for asynchronous operations
- Follow the [TypeScript coding guidelines](https://github.com/microsoft/TypeScript/wiki/Coding-guidelines)

### React Guidelines (for frontend)
- Use functional components with hooks
- Break UI into small, reusable components
- Use TypeScript for component props
- Follow React best practices

## Testing Guidelines

- Write tests for all new features and bug fixes
- Aim for high test coverage
- Test edge cases and error conditions
- Mock external dependencies in tests

## Pull Request Process

1. Ensure all tests pass and code meets linting standards
2. Update documentation if necessary
3. Submit the pull request with a clear description of the changes
4. Wait for code review and address any feedback
5. Once approved, your changes will be merged

## Issue Reporting

If you find a bug or have a feature request, please create an issue on the GitHub repository with the following information:

- A clear, descriptive title
- A detailed description of the issue or feature request
- Steps to reproduce (for bugs)
- Expected behavior and actual behavior (for bugs)
- Screenshots or code examples if applicable
- Environment information (OS, browser, etc.)

## Code of Conduct

Please be respectful and considerate of others when contributing to this project. We strive to create a welcoming and inclusive environment for all contributors.

## License

By contributing to Hashi, you agree that your contributions will be licensed under the same [MIT License](LICENSE) that covers the project.

## Contact

If you have questions or need help, please reach out to the Gomes Group team.

Thank you for your contribution!
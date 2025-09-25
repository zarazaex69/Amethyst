export class Validator {
  static validateUsername(username: string): boolean {
    // GitHub username validation rules:
    // - Only alphanumeric characters and hyphens
    // - Cannot start or end with a hyphen
    // - Length between 1 and 39 characters
    const usernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
    return usernameRegex.test(username) && username.length >= 1 && username.length <= 39;
  }

  static validateRepoName(repoName: string): boolean {
    // GitHub repository name validation rules:
    // - Only alphanumeric characters, hyphens, underscores, and dots
    // - Cannot start or end with a dot
    // - Length between 1 and 100 characters
    const repoRegex = /^[a-zA-Z0-9._-]+$/;
    return repoRegex.test(repoName) && 
           repoName.length >= 1 && 
           repoName.length <= 100 &&
           !repoName.startsWith('.') &&
           !repoName.endsWith('.');
  }

  static validateCommandArgs(args: string[]): { isValid: boolean; error?: string } {
    if (!args || args.length === 0) {
      return { isValid: false, error: 'Пожалуйста, укажите имя пользователя GitHub.' };
    }

    const username = args[0];
    if (!username || !this.validateUsername(username)) {
      return { isValid: false, error: 'Неверное имя пользователя GitHub.' };
    }

    if (args.length > 1) {
      const repoName = args[1];
      if (!repoName || !this.validateRepoName(repoName)) {
        return { isValid: false, error: 'Неверное имя репозитория.' };
      }
    }

    return { isValid: true };
  }

  static sanitizeInput(input: string): string {
    // Remove potentially dangerous characters
    return input.replace(/[<>]/g, '').trim();
  }
}

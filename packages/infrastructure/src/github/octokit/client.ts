import { Octokit } from '@octokit/rest'
import { createAppAuth } from '@octokit/auth-app'

export interface GitHubConfig {
  appId?: string
  privateKey?: string
  installationId?: number
  token?: string
}

export class GitHubClient {
  private octokit: Octokit

  constructor(config: GitHubConfig) {
    if (config.token) {
      // Personal access token
      this.octokit = new Octokit({
        auth: config.token,
      })
    } else if (config.appId && config.privateKey && config.installationId) {
      // GitHub App
      this.octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId: config.appId,
          privateKey: config.privateKey,
          installationId: config.installationId,
        },
      })
    } else {
      // Unauthenticated
      this.octokit = new Octokit()
    }
  }

  /**
   * Get repository information
   */
  async getRepo(owner: string, repo: string) {
    const { data } = await this.octokit.repos.get({
      owner,
      repo,
    })
    return data
  }

  /**
   * List branches
   */
  async listBranches(owner: string, repo: string) {
    const { data } = await this.octokit.repos.listBranches({
      owner,
      repo,
    })
    return data
  }

  /**
   * Create a branch
   */
  async createBranch(owner: string, repo: string, branchName: string, sha: string) {
    const { data } = await this.octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha,
    })
    return data
  }

  /**
   * Get commit history
   */
  async getCommits(owner: string, repo: string, sha?: string, perPage = 30) {
    const { data } = await this.octokit.repos.listCommits({
      owner,
      repo,
      sha,
      per_page: perPage,
    })
    return data
  }

  /**
   * Create a commit
   */
  async createCommit(
    owner: string,
    repo: string,
    message: string,
    tree: string,
    parents: string[]
  ) {
    const { data } = await this.octokit.git.createCommit({
      owner,
      repo,
      message,
      tree,
      parents,
    })
    return data
  }

  /**
   * Create or update file
   */
  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    content: string,
    sha?: string
  ) {
    const { data } = await this.octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      sha,
    })
    return data
  }

  /**
   * List pull requests
   */
  async listPullRequests(owner: string, repo: string, state: 'open' | 'closed' | 'all' = 'open') {
    const { data } = await this.octokit.pulls.list({
      owner,
      repo,
      state,
    })
    return data
  }

  /**
   * Create pull request
   */
  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    head: string,
    base: string,
    body?: string
  ) {
    const { data } = await this.octokit.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body,
    })
    return data
  }

  /**
   * Merge pull request
   */
  async mergePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge'
  ) {
    const { data } = await this.octokit.pulls.merge({
      owner,
      repo,
      pull_number: pullNumber,
      merge_method: mergeMethod,
    })
    return data
  }

  /**
   * Get authenticated user
   */
  async getAuthenticatedUser() {
    const { data } = await this.octokit.users.getAuthenticated()
    return data
  }
}

/**
 * Create GitHub client from environment
 */
export function createGitHubClient(): GitHubClient {
  const token = process.env.GITHUB_TOKEN
  
  if (!token) {
    throw new Error('GITHUB_TOKEN environment variable is required')
  }

  return new GitHubClient({ token })
}

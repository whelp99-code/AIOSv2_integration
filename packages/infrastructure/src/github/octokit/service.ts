import { GitHubClient, createGitHubClient } from './client'

export interface GitHubRepository {
  owner: string
  repo: string
}

export interface BranchInfo {
  name: string
  sha: string
  protected: boolean
}

export interface CommitInfo {
  sha: string
  message: string
  author: string
  date: string
}

export interface PullRequestInfo {
  number: number
  title: string
  state: string
  url: string
  createdAt: string
}

export class GitHubService {
  private client: GitHubClient

  constructor(client?: GitHubClient) {
    this.client = client || createGitHubClient()
  }

  /**
   * Get repository branches
   */
  async getBranches(repo: GitHubRepository): Promise<BranchInfo[]> {
    const branches = await this.client.listBranches(repo.owner, repo.repo)
    return branches.map(branch => ({
      name: branch.name,
      sha: branch.commit.sha,
      protected: branch.protected,
    }))
  }

  /**
   * Create a new branch
   */
  async createBranch(
    repo: GitHubRepository,
    branchName: string,
    baseBranch: string = 'main'
  ): Promise<BranchInfo> {
    // Get base branch SHA
    const branches = await this.client.listBranches(repo.owner, repo.repo)
    const base = branches.find(b => b.name === baseBranch)
    
    if (!base) {
      throw new Error(`Base branch ${baseBranch} not found`)
    }

    const ref = await this.client.createBranch(
      repo.owner,
      repo.repo,
      branchName,
      base.commit.sha
    )

    return {
      name: branchName,
      sha: ref.object.sha,
      protected: false,
    }
  }

  /**
   * Get commit history
   */
  async getCommitHistory(
    repo: GitHubRepository,
    branch?: string,
    limit: number = 30
  ): Promise<CommitInfo[]> {
    const commits = await this.client.getCommits(repo.owner, repo.repo, branch, limit)
    return commits.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || 'Unknown',
      date: commit.commit.author?.date || '',
    }))
  }

  /**
   * Create or update a file
   */
  async createOrUpdateFile(
    repo: GitHubRepository,
    path: string,
    content: string,
    message: string,
    branch?: string
  ): Promise<{ sha: string }> {
    // Get existing file SHA if updating
    let sha: string | undefined = undefined
    try {
      // Note: In real implementation, you'd get the file's SHA
      // const { data } = await this.client.getRepo(repo.owner, repo.repo)
    } catch (_error) {
      // File doesn't exist, create new
    }

    const result = await this.client.createOrUpdateFile(
      repo.owner,
      repo.repo,
      path,
      message,
      content,
      sha
    )

    return { sha: result.content?.sha || '' }
  }

  /**
   * Get pull requests
   */
  async getPullRequests(
    repo: GitHubRepository,
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<PullRequestInfo[]> {
    const prs = await this.client.listPullRequests(repo.owner, repo.repo, state)
    return prs.map(pr => ({
      number: pr.number,
      title: pr.title,
      state: pr.state,
      url: pr.html_url,
      createdAt: pr.created_at,
    }))
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    repo: GitHubRepository,
    title: string,
    head: string,
    base: string,
    body?: string
  ): Promise<PullRequestInfo> {
    const pr = await this.client.createPullRequest(
      repo.owner,
      repo.repo,
      title,
      head,
      base,
      body
    )

    return {
      number: pr.number,
      title: pr.title,
      state: pr.state,
      url: pr.html_url,
      createdAt: pr.created_at,
    }
  }

  /**
   * Get authenticated user
   */
  async getCurrentUser() {
    return this.client.getAuthenticatedUser()
  }
}

/**
 * Create GitHub service from environment
 */
export function createGitHubService(): GitHubService {
  return new GitHubService()
}

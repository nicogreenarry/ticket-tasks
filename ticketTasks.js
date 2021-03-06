const bluebird = require('bluebird');
const cli = require('commander');
const promptly = require('promptly');

// GIT presets
const hasGitTeamDefault = false; // Can be overruled by script parameter
const gitHasStaging = false;
const gitHasTesting = false;

// HI presets
const hiStagingPreAcceptanceTesting = false;
const hiHasDesigner = false;

const main = bluebird.coroutine(function* (cli) {
  const repo = {
    git: 'https://github.com/nicogreenarry/git',
    hi: 'https://github.com/captain401/provider',
  };

  // If gitTeam parameter was passed, use its value (`true` or `"true"` vs. 'false'). Otherwise, use hasGitTeamDefault.
  const hasGitTeam = cli.gitTeam === undefined
    ? hasGitTeamDefault
    : [true, 'true'].includes(cli.gitTeam);

  // Tasks to be used for both tickets and PRs
  const genericTasks = [];

  // Ticket tasks (pivotal or jira; not PR)
  const ticketTasks = [];

  const prTasks = [
    {
      header: true,
      message: 'Tasks prior to approval',
    },
    {
      message: 'Update docs based on this change? If so, post docs to #eng_release and/or #eng_learn after the PR exists.',
    },
    {
      message: ({fix, hi}) => {
        const entities = hi ? 'people/companies/etc.' : 'users/contacts/stories/etc.';
        return fix
          ? 'Whom did this bug/issue/etc. affect? Even after fixing the issue, what do we need to do to address '
          + 'those problems? Even in the case of proactive fixes, think about taking retroactive action on '
          + `${entities} whom this change won’t automatically affect, but should.`
          : `Take retroactive action on ${entities} whom this change won’t automatically affect, but should.`;
      },
    },
    {
      test: ({featureBranch}) => featureBranch,
      message: 'If this PR is based on un-merged work in this feature branch, set that as the base branch of this PR. '
        + 'Otherwise, set the base branch to be the feature branch.',
    },
    {
      test: ({fix, hi}) => fix && hi,
      message: 'Set the base branch of the PR as `production`',
    },
    {
      test: ({hi, ui}) => ui && hi && hiHasDesigner,
      message: 'Pre-merge acceptance: Get design approval',
    },
    {
      test: ({feature, hi}) => feature && hi,
      message: 'Pre-merge acceptance: Get PM approval (likely from Graham)',
    },
    {
      test: ({hi}) => hi,
      message: 'Open circleCI tabs so I’ll immediately be notified of test failures',
    },
    {
      test: ({chore, fix, hi}) => hi && (chore || fix),
      message: 'Add Hotfix label to PR?',
    },
    {
      test: ({ui}) => ui,
      message: 'JSX/TSX: Resolve any warnings/errors in the browser console',
    },
    {
      test: ({style}) => !style,
      message: 'Do manual testing; record my steps. Even for chores, at least deploy app locally',
    },
    {
      test: ({chore, hi, style}) => hi && !(chore || style),
      message: 'Add automated tests',
    },
    {
      test: ({style}) => !style,
      message: 'Review: Search "files changed" in PR, and deal with or get rid of each ASSUMPTION, TODO, FIXME, HACK,' +
        ' and console. First, make sure the page is refreshed, and that all "Load Diff" files are expanded ' +
        '(except for `package-lock`). If there are instances I added/changed and won’t remove, consider commenting' +
        ' on them (in code or in the PR) to explain them.',
    },
    {
      test: ({style}) => !style,
      message: 'Update the "Changes here include..." and "Tests" sections of the PR description',
    },
    {
      test: ({git, hi}) => hi || git && hasGitTeam,
      message: 'Request review for PR',
    },
    {
      test: ({hi}) => hi,
      message: 'Make a note to bring this up in stand-up (and potentially retro)',
    },
    {
      test: ({git, hi, pivotal}) => pivotal && (hi || git && hasGitTeam),
      message: 'Add a blocker in this ticket linking the reviewer: @USERNAME review' +
        ` [PR _____](${repo.hi}/pull/_____)`,
    },
    {
      // If there's no ticket, e.g. for a style fix, no need to track carefully - we can skip this task
      test: ({pivotal}) => (pivotal),
      message: ({hi, jira, pivotal}) => {
        const relevantRepo = repo[hi ? 'hi' : 'git'];
        const ticketSource = jira ? 'Jira' : 'Pivotal';
        const linkMarkdown = jira ? `[PR ___|${relevantRepo}/pull/___]` : `[PR ___](${relevantRepo}/pull/___)`;
        return `Record task in ticket: PR: Complete all steps: ${linkMarkdown}`;
      },
    },
    {
      test: ({git, hi, pivotal}) => pivotal && (hi || git && hasGitTeam),
      message: 'Resolve the blocker for the PR reviewer',
    },
    {
      message: 'Check for any `git stash` entries that are relevant; delete them once I’m done ' +
        'with them',
    },
    {
      test: ({chore, git, hi, style}) => !chore && !style && ((hi && hiStagingPreAcceptanceTesting) || git && gitHasStaging),
      message: 'Pre-merge, on staging: as an engineer, perform final acceptance testing on the deployed version of' +
        ' the code',
    },
    {
      test: ({feature, fix, git, hi}) => (feature || fix) && ((hi && hiStagingPreAcceptanceTesting) || git && hasGitTeam && gitHasStaging),
      message: 'Wait for pre-acceptance testing on staging before merging. If no pre-acceptance testing required, at' +
        ' least get approval from relevant stakeholder(s) before merging PR (if this is merging into an epic/release' +
        ' branch, move this task into the Epic meta ticket',
    },
    {
      test: ({git, hi}) => hi || git && hasGitTeam,
      message: 'Get reviewer approval',
    },
    {
      test: ({git, hi}) => hi || git && hasGitTeam,
      message: 'Address reviewer comments',
    },
    {
      message: 'Make sure I don’t have changes I didn’t push (e.g. responding to PR comments)',
    },
    {
      test: ({git, hi}) => hi || git && gitHasTesting,
      message: 'Wait for tests to pass on final commit',
    },

    // AFTER MERGE
    {
      header: true,
      message: 'Tasks after approval/merge',
    },
    {
      message: 'Merge PR',
    },
    {
      test: ({featureBranch}) => featureBranch,
      message: 'Update the base branches of any PRs that are based on this PR (search PRs with base:BRANCH_NAME)'
    },
    {
      test: ({feature, fix, pivotal}) => (feature || fix) && pivotal,
      message: 'Once the final PR is merged, mark ticket Finished (for Chores, do this task last)',
    },
    {
      message: 'Delete local/remote branches',
    },
    {
      test: ({git}) => git && gitHasTesting,
      message: 'Make sure tests pass after merging into the terminal branch ' +
        '([master](https://github.com/captain401/provider/commits/master), ' +
        '[production](https://github.com/captain401/provider/commits/production))',
    },
    {
      // For GIT, since we don't yet have a scheduled deploy process, I want a reminder to deploy each PR.
      test: ({feature, featureBranch, fix, git}) => !featureBranch && (git || feature || fix),
      message: 'Deploy the code',
    },
    {
      test: ({feature, featureBranch, fix}) => !featureBranch && (feature || fix),
      message: 'As an engineer, perform final acceptance testing on the deployed version of the code',
    },
    {
      test: ({hi, jira, style}) => !style && hi && jira,
      message: 'Mark ticket as "Ready to accept"? Skip if I know of more engineering work I need to do.',
    },
    {
      test: ({feature, featureBranch, fix, hi}) => !featureBranch && hi && (feature || fix),
      message: 'Post about this in the #eng_release slack channel (with screenshots/gifs)?',
    },
    {
      test: ({chore, hi, style}) => hi && !(chore || style),
      message: 'Should I demonstrate this work (e.g. at a Eng staff meeting)?',
    },
    {
      test: ({hi, style}) => hi && !style,
      message: 'Record in [CMD](https://todoist.com/app#task%2F631329605), MILO notes, as Retro/etc. sticky?',
    },
    {
      test: ({feature, fix, pivotal}) => (feature || fix) && pivotal,
      message: 'Once the final PR/branch is deployed, mark ticket Delivered',
    },

    // STYLE PR ONLY
    {
      test: ({style}) => style,
      message: `No ticket
      No testing; no functional changes
  No need to coordinate deployment

  Just style fixes.

    Suggestions for reviewing style-fix PRs:
    * There shouldn't be any functional changes, so if you see anything that looks like one, call it out.
  * You may want to review using Unified view (rather than Split view). I prefer Split view for most PRs,`
        + ' because I can see each version on its own. But for these style PRs, ' +
        'each change can really be considered on its own, without consideration for the other changes around it, ' +
        'and the Unified view sometimes makes that easier.',
    },
  ];

  // ASK RELEVANT QUESTIONS IF USER DIDN'T SUPPLY ENOUGH FLAGS
  if (!cli.git && !cli.hi) {
    const response = yield promptly.prompt('Is this work for Human Interest (hi) or Get In Touch (git)? [hi]', {
      default: 'hi',
      validator(value) {
        if (['git', 'hi'].includes(value)) {
          return value;
        }
        throw new Error('Value must be either "git" or "hi".');
      },
    });
    cli[response] = true;
  }

  // Use the feature-branch flag as a shorthand for feature && feature-branch
  if (cli.featureBranch) {
    cli.feature = true;
  }

  if (![cli.chore, cli.feature, cli.featureBranch, cli.fix, cli.style].includes(true)) {
    const response = yield promptly.prompt(
      'What type of work is this? chore, feature, feature-branch, fix, style? [feature]',
      {
        default: 'feature',
        validator(value) {
          if (['chore', 'feature', 'feature-branch', 'fix', 'style'].includes(value)) {
            return value;
          }
          throw new Error('Value must be one of chore, feature, feature-branch, fix, style.');
        },
      }
    );
    cli[response] = true;
  }

  if (!cli.jira && !cli.pivotal) {
    // Style branches have no ticket, so ignore them
    if (!cli.style) {
      // HI always uses jira, so use that if jira/pivotal wasn't specified. GIT always uses pivotal.
      const ticketService = cli.hi ? 'jira' : 'pivotal';
      cli[ticketService] = true;
    }
  }

  // If I enter either `--ui` or `--ui false`, cli.ui will be truthy; I need to change it to
  // true/false based on which value it is.
  if (cli.hasOwnProperty('ui')) {
    cli.ui = [true, 'true'].includes(cli.ui); // `--ui` and `--ui true` both mean "yes, UI"
  } else {
    // If I didn't use the ui flag at all, ask about it
    const response = yield promptly.prompt('Does this work involve any UI work (y/n)? [n]', {
      default: 'n',
      validator(value) {
        if (['y', 'n'].includes(value)) {
          return value;
        }
        throw new Error('Value must be either y/n.');
      },
    });
    cli.ui = response === 'y';
  }

  // PRINT OUT THE RELEVANT TASKS
  const allPrTasks = genericTasks.concat(prTasks);
  const allTicketTasks = genericTasks.concat(ticketTasks);
  const prPrefix = '* [ ] ';

  // Log PR tasks
  allPrTasks
    .filter((task) => !task.test || task.test(cli)) // Include tasks with no `test` property; otherwise use test
    .forEach((task) => {
      const message = typeof task.message === 'function' ? task.message(cli) : task.message;
      console.log(`${task.header ? '\n## ' : prPrefix}${message}`);
    });

  // Log a couple of empty lines
  console.log('\n\n');

  // Log ticket tasks
  allTicketTasks
    .filter((task) => !task.test || task.test(cli)) // Include tasks with no `test` property; otherwise use test
    .forEach((task) => {
      const message = typeof task.message === 'function' ? task.message(cli) : task.message;
      console.log(`${task.header ? '\n' : ''}${message}`);
    });
});

if (require.main === module) {
  cli
    .version('0.0.1')
    // Reserved flags (used by commander): -V, -h

    // Which company/project the tasks are for
    .option('-g, --git', 'Get In Touch tasks') // cli.git
    .option('--hi', 'Human Interest tasks') // cli.hi

    // Type of work
    .option('-c, --chore', 'Chore (improvements only devs will notice)') // cli.chore
    .option('-f, --feature', 'Feature (adding business value)') // cli.feature
    .option('--feature-branch', 'Feature branch (multiple PRs into a single branch, separate from master)') // cli.featureBranch
    .option('--fix', 'Fix (a bugfix)') // cli.fix
    .option('-s, --style', 'Style (linting improvements and similar cleanup)') // cli.style

    // Location of ticket
    .option('-j, --jira', 'Jira ticket') // cli.jira
    .option('-p, --pivotal', 'Pivotal ticket') // cli.pivotal

    // Other flags
    .option('-u, --ui [ui]', 'Whether there is any UI work involved') // cli.ui
    .option('--git-team [gitTeam]', 'Whether there are GIT team members, e.g. for reviewing PRs') // cli.gitTeam

    .parse(process.argv);

  main(cli);
}

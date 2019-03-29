const bluebird = require('bluebird');
const cli = require('commander');
const promptly = require('promptly');

// GIT presets
const hasGitTeamDefault = false; // Can be overruled by script parameter
const gitHasStaging = false;
const gitHasTesting = false;

// HI presetns
const hiStagingPreAcceptanceTesting = false;

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
  const genericTasks = [
    { message: 'Should I demonstrate this work (e.g. at a Eng staff meeting)?' },
  ];

  // Ticket tasks (pivotal or jira; not PR)
  const ticketTasks = [
    // PREWORK
    {
      test: ({ui}) => ui,
      message: 'Create several versions of mockups for the thing I’m building',
    },
    {
      test: ({ui}) => ui,
      message: ({git}) => `Publish some mockups to appropriate channels: ticket, PR, slack${
        git ? ', kickstarter, blog' : ''
      }?`,
    },

    // POSTWORK
    {
      test: ({hi, ui}) => ui && hi,
      message: 'Create blocker: @thomas_walichiewicz and/or @mohan_surya: language/design sign-off',
    },
    {
      test: ({ui}) => ui,
      message: 'Publish screenshots of the completed work',
    },
    {
      message: 'Update docs based on this change? If so, post docs to #eng_learn after the PR exists.',
    },
    {
      test: ({feature, fix, git, hi}) => (feature || fix) && ((hi && hiStagingPreAcceptanceTesting) || git && gitHasStaging),
      message: 'Pre-acceptance testing on staging: Write a comment, "@REQUESTER, this is ready for pre-acceptance' +
        ' testing on staging; see PR_URL for the staging url. You can test it by STEPS_TO_TEST". Create a blocker' +
        ' labeling requester: "@REQUESTER pre-acceptance test ticket per comment". OR if it’s something that can’t ' +
        'be tested easily on staging, consider one of these comments: "@REQUESTER, this is ready for a pre-acceptance' +
        ' test. I’ll have to demo it for you on my machine - can you let me know when might be a good time?"',
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
      test: ({fix}) => fix,
      message: 'Resolve any related rollbars (see Jira integration and comments)',
    },
    {
      test: ({feature, fix}) => feature || fix,
      message: 'Post-deploy Acceptance testing. Comment with testing procedures, and create blocker. Indicate whether' +
      ' tester should Accept/Resolve ticket when they’re satisfied.',
    },
    {
      message: 'Report out about this? See checklist (link to checklist?). Post high-level status update somewhere,' +
        ' e.g. to slack channel?',
    },
    {
      test: ({fix}) => fix,
      message: 'Think about (1) what improved design, resolved tech debt, etc. could have prevented this issue,' +
        ' and (2) what improved design/debugging/error reporting/etc. would have made it faster to debug and solve'
    }
  ];

  const prTasks = [
    {
      header: true,
      message: 'Tasks prior to approval',
    },
    {
      test: ({hi}) => hi,
      message: 'Open circleCI tabs so I’ll immediately be notified of test failures',
    },
    {
      test: ({chore, fix}) => chore || fix,
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
      test: ({git, hi, pivotal}) => pivotal && (hi || git && hasGitTeam),
      message: 'Add a blocker in this ticket linking the reviewer: @USERNAME review' +
        ` [PR _____](${repo.hi}/pull/_____)`,
    },
    {
      test: ({jira, pivotal}) => (jira || pivotal),
      message: ({hi, pivotal}) => {
        const relevantRepo = repo[hi ? 'hi' : 'git'];
        const ticketSource = pivotal ? 'Pivotal' : 'Jira';
        const linkMarkdown = pivotal ? `[PR ___](${relevantRepo}/pull/___)` : `[PR ___|${relevantRepo}/pull/___]`;
        return `Move this into the ${ticketSource} task: PR: Follow through to get approval for ${
          linkMarkdown
        }, and complete all tasks on PR`;
      },
    },
    {
      test: ({hi, jira}) => hi && jira,
      message: 'Update ticket status to Code Complete, and update ticket title ("[AWAITING code review]")',
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
      message: ({hi}) => `${hi ? '[NOT DURING CODEFREEZE] ' : ''}Merge PR into appropriate terminal branch (to production, master, or a staging branch,` 
        + ' for hotfixes, quick wins, and epic stories, respectively)',
    },
    {
      test: ({feature, pivotal}) => feature && pivotal,
      message: 'Once the final PR is merged, mark ticket Finished (for Chores, do this task last)',
    },
    {
      message: ({git}) => `Delete local/remote branches ${git ? 'using "git checkout master && git pull && git branch -d "' : ''}`,
    },
    {
      test: ({git}) => git && gitHasTesting,
      message: 'Make sure tests pass after merging into the terminal branch ' +
        '([master](https://github.com/captain401/provider/commits/master), ' +
        '[production](https://github.com/captain401/provider/commits/production))',
    },
    {
      test: ({hi, jira}) => hi && jira,
      message: 'Update ticket title to reflect status (e.g. "[AWAITING DATE deploy]")',
    },
    {
      // For GIT, since we don't yet have a scheduled deploy process, I want a reminder to deploy each PR.
      test: ({feature, fix, git}) => git || feature || fix,
      message: 'Deploy the code (to production, master, or a staging branch, for hotfixes, ' +
        'quick wins, and epic stories, respectively)',
    },
    {
      test: ({feature, fix}) => feature || fix,
      message: 'As an engineer, perform final acceptance testing on the deployed version of the code, per the ' +
        'acceptance testing steps in the Acceptance Testing log',
    },
    {
      test: ({hi, ui}) => hi && ui,
      message: 'Take screenshots of various UI states and add them to ' +
        '[our design repo](https://github.com/captain401/design) (`cd dev/design`), and probably to PR description' +
        ' (or as comments if there are a lot of them). If they’re just a small change to a page (adding a button),' +
        ' name them the same as the main screen with an appended A (e.g. 00A.png for a summary screen change)',
    },
    {
      test: ({hi, style}) => hi && !style,
      message: 'Record in CMD, MILO notes, as Retro/etc. sticky?',
    },
    {
      test: ({feature, pivotal}) => feature && pivotal,
      message: 'Once the final PR/branch is deployed, mark ticket Delivered',
    },
    {
      test: ({hi, jira}) => hi && jira,
      message: 'Update ticket title to reflect status (e.g. "[AWAITING acceptance test]")',
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

  console.log('Task templates: https://github.com/nicogreenarry/ticket-tasks/edit/master/ticketTasks.js');

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

  if (!cli.chore && !cli.feature && !cli.fix && !cli.style) {
    const response = yield promptly.prompt('What type of work is this? chore, feature, fix, style? [feature]', {
      default: 'feature',
      validator(value) {
        if (['chore', 'feature', 'fix', 'style'].includes(value)) {
          return value;
        }
        throw new Error('Value must be one of chore, feature, fix, style.');
      },
    });
    cli[response] = true;
  }

  if (!cli.jira && !cli.pivotal) {
    const response = yield promptly.prompt('Where does the ticket/task live? jira, pivotal? [pivotal]', {
      default: 'pivotal',
      validator(value) {
        if (['jira', 'pivotal'].includes(value)) {
          return value;
        }
        throw new Error('Value must be one of jira, pivotal.');
      },
    });
    cli[response] = true;
  }

  // If I enter either `--ui` or `--ui false`, cli.ui will be truthy; I need to change it to
  // true/false based on which value it is.
  if (cli.ui) {
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
  const ticketPrefix = cli.jira ? '# ' : '';
  
  // Log PR tasks
  allPrTasks
    .filter((task) => !task.test || task.test(cli)) // Include tasks with no `test` property; otherwise use test
    .forEach((task) => {
      const message = typeof task.message === 'function' ? task.message(cli) : task.message;
      console.log(`${task.header ? '## ' : prPrefix}${message}`);
    });
  
  // Log a couple of empty lines
  console.log('\n\n');
  
  // Log ticket tasks
  allTicketTasks
    .filter((task) => !task.test || task.test(cli)) // Include tasks with no `test` property; otherwise use test
    .forEach((task) => {
      const message = typeof task.message === 'function' ? task.message(cli) : task.message;
      console.log(`${task.header ? '' : ticketPrefix}${message}`);
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

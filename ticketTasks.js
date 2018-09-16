const bluebird = require('bluebird');
const cli = require('commander');
const promptly = require('promptly');

const main = bluebird.coroutine(function* (cli) {
  const repo = {
    git: 'https://github.com/nicogreenarry/get-in-touch',
    hi: 'https://github.com/captain401/provider',
  };

  const genericTasks = [
    {
      message: 'Anything about this to discuss with team (e.g. at Retro/IPM/ARB)? Consider at' +
        ' the beginning of work, but don\'t close task until finishing',
    }
  ];

  // Ticket tasks (pivotal or jira; not PR)
  const ticketTasks = [
    // PREWORK
    {
      message: 'Create sticky for eng standup',
    },
    {
      test: ({feature}) => feature,
      message: 'Make sure relevant stakeholders are looped in (e.g. Vijay for FTW work)',
    },
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
    {
      message: ({git}) => `Share any open questions I have about things I’m working on, on slack, in ticket${
        git ? ', on project blog' : ''
      }...`,
    },
    {
      message: 'If there’s discussion about this outside of the ticket (e.g. in slack), link from the ticket to that ' +
        'location(s), and vice versa',
    },

    // WORK
    {
      message: 'Grep the codebase for the ticket number to find other code that needs to be updated',
    },
    {
      test: ({chore}) => chore,
      message: 'Write tests? Probably only if it\'s a critical piece of code that isn\'t well tested.',
    },
    {
      test: ({chore}) => !chore,
      message: 'Write automated tests',
    },
    {
      test: ({chore}) => !chore,
      message: ({hi}) => `Test against expected edge cases (ultimately create a doc with examples of common edge cases${
        hi 
          ? ', e.g. for users, try regular users, admins, external admins, document signers, internal users, and ' +
            'unified users' 
          : ''
      })`,
    },

    // POSTWORK
    {
      test: ({hi, ui}) => ui && hi,
      message: 'Create blocker: @thomas_walichiewicz and/or @mohan_surya: language/design sign-off',
    },
    {
      message: 'Merge the code into master/production',
    },
    {
      message: 'Deploy it',
    },
    {
      test: ({chore}) => !chore,
      message: 'If relevant, once deployed, run the entire task / go through the entire process / etc. during the' +
        ' working day, in order to catch and debug errors while things are still fresh.',
    },
    {
      test: ({chore}) => !chore,
      message: 'Develop metrics/etc. to verify it\'s working on an ongoing basis, and make sure we know if it stops' +
        ' working',
    },
    {
      test: ({chore}) => !chore,
      message: 'PII: Delete any PII-ful data saved in Downloads folder; refresh scrubbed local db if my db has PII',
    },
    {
      message: 'Share any remaining open questions I have about things I’m working on',
    },
    {
      test: ({ui}) => ui,
      message: 'Publish screenshots of the completed work',
    },
    {
      message: 'Update docs based on this change?',
    },
    {
      message: 'Create ticket(s) for any unfinished spec, including Bonus spec',
    },
    {
      test: ({chore, git}) => !chore && !git,
      message: 'Pre-acceptance testing on staging: Write a comment, "@REQUESTER, this is ready for pre-acceptance' +
        ' testing on staging; see PR_URL for the staging url. You can test it by STEPS_TO_TEST". Create a blocker' +
        ' labeling requester: "@REQUESTER pre-acceptance test ticket per comment". OR if it\'s something that can\'t ' +
        'be tested easily on staging, consider one of these comments: "@REQUESTER, this is ready for a pre-acceptance' +
        ' test. I\'ll have to demo it for you on my machine - can you let me know when might be a good time?"',
    },
    {
      test: ({fix}) => fix,
      message: 'Whom did this bug/issue/etc. affect? Even after fixing the issue, what do we need to do to address ' +
        'those problems? Even in the case of proactive fixes, think about taking retroactive action on ' +
        'people/companies/etc. whom this change won\'t automatically affect, but should.',
    },
    {
      test: ({fix}) => fix,
      message: 'Resolve any related rollbars (see Jira integration and comments)',
    },
    {
      test: ({fix}) => !fix,
      message: 'Take retroactive action on people/companies/etc. whom this change won\'t automatically affect, but' +
        ' should.',
    },
    {
      test: ({chore}) => !chore,
      message: 'Post-deploy Acceptance testing. Comment with testing procedures, and create blocker. Indicate whether' +
      ' tester should Accept/Resolve ticket when they\'re satisfied.',
    },
    {
      test: ({git}) => git,
      message: 'Adjust ' +
        '[roadmap](https://docs.google.com/spreadsheets/d/1oxYpQwzd2cdSjSrAwesdrOHkKF7XIjhEzPm5wXmYBPQ/edit#gid=0) ' +
        'if appropriate',
    },
    {
      message: 'Report out about this? See checklist (link to checklist?). Post high-level status update somewhere,' +
        ' e.g. to slack channel?',
    },
  ];

  const prTasks = [
    {
      header: true,
      message: 'Tasks prior to approval',
    },
    {
      message: 'Assign PR to myself (and to colleague if I\'m pairing)',
    },
    {
      message: 'Open circleCI tabs so I\'ll immediately be notified of test failures',
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
      test: ({chore, style}) => !(chore || style),
      message: 'Do manual testing; record my steps',
    },
    {
      test: ({chore, style}) => !(chore || style),
      message: 'Add automated tests',
    },
    {
      test: ({style}) => !style,
      message: 'Review: Search "files changed" in PR, and deal with or get rid of each ASSUMPTION, TODO, FIXME, HACK,' +
        ' and console. First, make sure the page is refreshed, and that all "Load Diff" files are expanded (well' +
        ' except for `package-lock`). If there are instances I added/changed and won\'t remove, consider commenting' +
        ' on them (in code or in the PR) to explain them. TODO: Replace with something like this (use a regex for' +
        ' case insensitivity?): `git diff master | grep "console.log"`',
    },
    {
      test: ({style}) => !style,
      message: 'Update the "Changes here include..." and "Tests" sections of the PR description',
    },
    {
      test: ({hi}) => hi,
      message: 'Request review for PR',
    },
    {
      test: ({hi, pivotal, pr}) => hi && pivotal && pr,
      message: 'Add a blocker in this ticket linking the reviewer: @USERNAME review' +
        ` [PR _____](${repo.hi}/pull/_____)`,
    },
    {
      test: ({hi, pivotal, pr}) => hi && pivotal && pr,
      message: 'Move this into the Pivotal task: PR: Follow through to get approval for ' +
      `[PR ___](${repo.hi}/pull/___), and complete all tasks on PR`,
    },
    {
      test: ({hi, pivotal, pr}) => hi && pivotal && pr,
      message: 'Resolve the blocker for the PR reviewer',
    },
    {
      test: ({hi, jira, pr}) => hi && jira && pr,
      message: 'Move this into the Jira ticket: PR: Follow through to get approval for ' +
        `[PR ___|${repo.hi}/pull/___], and complete all tasks on PR`,
    },
    {
      test: ({jira, pivotal, pr}) => !(jira || pivotal) && pr,
      message: ({hi}) => 'Create this Todoist task: Style improvements PR: Follow through to get approval' +
        ` for [PR ___](${hi ? repo.hi : repo.git}/pull/___), and complete all tasks` +
        ' on PR #work p1 tomorrow',
    },
    {
      message: 'Check for any `git stash` entries that are relevant; delete them once I\'m done ' +
        'with them',
    },
    {
      test: ({chore, git, style}) => !chore && !git && !style,
      message: 'Wait for pre-acceptance testing on staging before merging. If no pre-acceptance testing required, at' +
        ' least get approval from relevant stakeholder(s) before merging PR (if this is merging into an epic/release' +
        ' branch, move this task into the Epic meta ticket',
    },
    {
      test: ({chore, git, style}) => !chore && !git && !style,
      message: 'Pre-merge, on staging: as an engineer, perform final acceptance testing on the deployed version of' +
        ' the code',
    },
    {
      test: ({hi}) => hi,
      message: 'Wait for reviewer approval, and for tests to pass on final commit, before merging',
    },
    {
      message: 'Make sure I don\'t have changes I didn\'t push (e.g. responding to PR comments)',
    },

    // AFTER MERGE
    {
      header: true,
      message: 'Tasks after approval/merge',
    },
    {
      message: 'Merge PR into appropriate terminal branch (to production, master, or a staging branch, for hotfixes, quick wins, and epic stories, respectively)',
    },
    {
      test: ({feature, pivotal}) => feature && pivotal,
      message: 'Once the final PR is merged, mark ticket Finished (for Chores, do this task last)',
    },
    {
      message: 'Delete local/remote branches',
    },
    {
      test: ({hi}) => hi,
      message: 'Make sure tests pass after merging into the terminal branch ' +
        '([master](https://github.com/captain401/provider/commits/master), ' +
        '[production](https://github.com/captain401/provider/commits/production))',
    },
    {
      test: ({chore, style}) => !chore && !style,
      message: 'For package repos: bump version number in package repo package.json;' +
        ' Create release once merged; create PR in provider that bumps package number',
    },
    {
      test: ({chore, style}) => !chore && !style,
      message: 'Deploy the code (to production, master, or a staging branch, for hotfixes, ' +
        'quick wins, and epic stories, respectively)',
    },
    {
      test: ({chore, style}) => !chore && !style,
      message: 'As an engineer, perform final acceptance testing on the deployed version of the code',
    },
    {
      test: ({hi, ui}) => hi && ui,
      message: 'Take screenshots of various UI states and add them to ' +
        '[our design repo](https://github.com/captain401/design) (`cd dev/design`), and probably to PR description' +
        ' (or as comments if there are a lot of them). If they\'re just a small change to a page (adding a button),' +
        ' name them the same as the main screen with an appended A (e.g. 00A.png for a summary screen change)',
    },
    {
      test: ({style}) => !style,
      message: 'Record in CMD, MILO notes, as Retro/Stand-up/etc. sticky?',
    },
    {
      test: ({feature, pivotal}) => feature && pivotal,
      message: 'Once the final PR/branch is deployed, mark ticket Delivered',
    },


    // STYLE PR ONLY
    {
      test: ({style}) => style,
      message: `No ticket
No testing; no functional changes
No need to coordinate deployment

Just style fixes.`,
    },
  ];

  console.log('Task templates: https://github.com/nicogreenarry/ticket-tasks');

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

  if (!cli.jira && !cli.pivotal && !cli.pr) {
    const response = yield promptly.prompt('What type of work is this? jira, pivotal, pr? [pivotal]', {
      default: 'pivotal',
      validator(value) {
        if (['jira', 'pivotal', 'pr'].includes(value)) {
          return value;
        }
        throw new Error('Value must be one of jira, pivotal, pr.');
      },
    });
    cli[response] = true;
  }

  // If I enter either `--ui` or `--ui false`, cli.ui will be truthy; I need to change it to
  // true/false based on which value it is.
  if (cli.ui) {
    cli.ui = cli.ui === true;
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
  const tasks = genericTasks.concat(cli.pr ? prTasks : ticketTasks);
  let prefix = '';
  if (cli.pr) {
    prefix = '* [ ] ';
  } else if (cli.jira) {
    prefix = '* ';
  }
  tasks
    .filter((task) => !task.test || task.test(cli))
    .forEach((task) => {
      const message = typeof task.message === 'function' ? task.message(cli) : task.message;
      console.log(`${task.header ? '## ' : prefix}${message}`);
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
    .option('--pr', 'Pull Request') // cli.pr

    // Other flags
    .option('-u, --ui [ui]', 'Whether there is any UI work involved') // cli.ui

    .parse(process.argv);

  main(cli);
}
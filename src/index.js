
const PLUGIN_NAME = 'Evernote';
const PLUGIN_KEYWORD = 'evernote';
const PLUGIN_REGEX = /evernote(.*)/;

const _ = require('lodash');

const icon = require('../assets/icon.png');
const EvernoteService = require('./EvernoteService');

let evernoteService = null;

/**
 * Preview components
 */
// eslint-disable-next-line no-unused-vars
const { Preload, Loading } = require('cerebro-ui');

// eslint-disable-next-line no-unused-vars
const NoteContents = require('./Preview/NoteContents');

const displayLoader = (display) => {
  display({
    id: 'loader',
    title: 'Loading ...',
    icon: icon
  });
};

const hideLoader = (hide) => {
  hide('loader');
};

const displayMainMenu = (display, actions) => {
  const menu = [
    {
      title: 'Search Notes',
      subtitle: 'Please keep typing to search notes',
      icon: icon,
      onSelect: (event) => {
        event.preventDefault();
        actions.replaceTerm(`${PLUGIN_KEYWORD} `);
        return false;
      }
    },
    {
      title: 'List Notebooks',
      icon: icon,
      term: `${PLUGIN_KEYWORD} nb`,
      onSelect: (event) => {
        event.preventDefault();
        actions.replaceTerm(`${PLUGIN_KEYWORD} nb`);
        return false;
      }
    },
    {
      title: 'List Tags',
      icon: icon,
      term: `${PLUGIN_KEYWORD} tags`,
      onSelect: (event) => {
        event.preventDefault();
        actions.replaceTerm(`${PLUGIN_KEYWORD} tags`);
        return false;
      }
    },
    {
      title: 'Open Evernote Web',
      icon: icon,
      onSelect: () => {
        actions.open('https://www.evernote.com/Login.action');
      }
    },
  ];
  display(menu);
};

const searchNotes = _.debounce((term, display, actions, settings, hide) => {

  evernoteService = EvernoteService.getInstance(settings.accessToken, settings.sandbox);

  let results = [];

  displayLoader(display);

  Promise.all([
    evernoteService.getUser(),
    evernoteService.searchNotes(term)
  ]).then((values) => {
    const user = values[0];
    const notesList = values[1];

    if (notesList.notes.length === 0) {
      hideLoader(hide);

      display({
        icon: icon,
        title: 'No notes found matching your criteria'
      });
    } else {
      results = notesList.notes.map((note) => {
        return {
          id: note.guid,
          icon: icon,
          title: note.title,
          onSelect: () => {
            const noteUrl = evernoteService.buildNoteUrl(note, user, settings.openLinksOnApplication);
            actions.open(noteUrl);
          },
          getPreview: () => {
            const promise = evernoteService.getNoteContent(note.guid);
            return <Preload key={note.guid} promise={promise} loader={<Loading />}>
              {promiseResult => <NoteContents key={note.guid} contents={promiseResult} />}
            </Preload>;
          }
        };
      });

      hideLoader(hide);

      display(results, actions);
    }
  }).catch((err) => {
    hideLoader(hide);
    display({
      icon: icon,
      title: 'An error occurred when connecting to Evernote',
      subtitle: err.message
    });
  });
}, 300);

const listNotebooks = _.debounce((term, display, actions, settings, hide) => {

  evernoteService = EvernoteService.getInstance(settings.accessToken, settings.sandbox);

  let results = [];

  displayLoader(display);

  evernoteService.getNotebooks(term).then((notebooks) => {
    hideLoader(hide);

    if (notebooks.length === 0) {
      display({
        icon: icon,
        title: 'No results matching your search criteria'
      });
    } else {

      results = notebooks.map((nb) => {
        return {
          id: nb.guid,
          icon: icon,
          title: nb.name,
          term: `${PLUGIN_KEYWORD} notebook:${nb.name}`
        };
      });
      display(results, actions);
    }

  }).catch((err) => {
    hideLoader(hide);

    display({
      icon: icon,
      title: 'An error occurred when connecting to Evernote',
      subtitle: err.message
    });
  });
}, 300);

const listTags = _.debounce((term, display, actions, settings, hide) => {

  evernoteService = EvernoteService.getInstance(settings.accessToken, settings.sandbox);

  let results = [];

  displayLoader(display);

  evernoteService.getTags(term).then((tags) => {
    hideLoader(hide);

    if (tags.length === 0) {
      display({
        icon: icon,
        title: 'No results matching your search criteria'
      });
    } else {

      results = tags.map((t) => {
        return {
          id: t.guid,
          icon: icon,
          title: t.name,
          term: `${PLUGIN_KEYWORD} tag:${t.name}`
        };
      });
      display(results, actions);
    }

  }).catch((err) => {
    hideLoader(hide);

    display({
      icon: icon,
      title: 'Evernote Error',
      subtitle: err.message
    });
  });
}, 300);


const plugin = ({ term, display, actions, settings, hide }) => {

  const match = term.match(PLUGIN_REGEX);

  if (match) {

    if (!settings.accessToken) {
      display({
        title: 'Action required',
        subtitle: 'Please set your Evernote access token in the Plugin settings to be able to use this plugin',
        icon: icon,
        term: `${PLUGIN_KEYWORD} settings`
      });

      return;
    }

    const searchParts = match[1].trim().split(' ');

    switch (searchParts[0]) {
      case '':
        displayMainMenu(display);
        break;
      case 'tags':
        searchParts.shift();
        listTags(searchParts.join('_'), display, actions, settings, hide);
        break;
      case 'nb':
        searchParts.shift();
        listNotebooks(searchParts.join('_'), display, actions, settings, hide);
        break;
      default:
        searchNotes(searchParts[0], display, actions, settings, hide);
        break;
    }
  }
};

module.exports = {
  fn: plugin,
  name: PLUGIN_NAME,
  keyword: PLUGIN_KEYWORD,
  icon,
  settings: {
    accessToken: { type: 'string' },
    sandbox: { type: 'bool', defaultValue: false },
    openLinksOnApplication: { type: 'bool', defaultValue: false },
  }
};

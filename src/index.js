
const PLUGIN_NAME = 'Evernote';
const PLUGIN_KEYWORD = 'evernote';
const PLUGIN_REGEX = /evernote\s(.*)/;

const icon = require('../assets/icon.png');
const EvernoteService = require('./evernoteService');

const { Preload, Loading } = require('cerebro-ui');
const NoteContents = require('./Preview/NoteContents');

const NotePreview = (key, promise) => (
  <Preload key={key} promise={promise}>
    {(promiseResult) => <NoteContents key={key} contents={promiseResult} /> }
  </Preload >
);

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
  ];
  display(menu);
};

const searchNotes = (term, display, actions, settings, hide) => {

  const evernoteService = new EvernoteService(settings.accessToken, settings.sandbox);

  let results = [];

  displayLoader(display);

  /*evernoteService.getUser().then((user) => {
    console.log(user);
  });*/

  Promise.all([
      evernoteService.getUser(),
      evernoteService.searchNotes(term)
  ]).then((values) => {
    const user = values[0];
    const notesList = values[1];

    hideLoader(hide);

    if (notesList.notes.length === 0) {
      display({
        icon: icon,
        title: 'No results matching your search criteria'
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
            return NotePreview(note.guid, promise);
          }
        };
      });
      display(results, actions);
    }
  }).catch((err) => {
    display({
      icon: icon,
      title: 'Error fetching results from Evernote',
      subtitle: err
    });
  });
};

const listNotebooks = (term, display, actions, settings, hide) => {

  const evernoteService = new EvernoteService(settings.accessToken, settings.sandbox);

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
      title: 'Error fetching results from Evernote',
      subtitle: err
    });
  });
};


const listTags = (term, display, actions, settings, hide) => {

  const evernoteService = new EvernoteService(settings.accessToken, settings.sandbox);

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
      title: 'Error fetching results from Evernote',
      subtitle: err
    });
  });
};

/**
 * Plugin entrypoint.
 * @see https://github.com/KELiON/cerebro/blob/master/docs/plugins.md for documentation
 *
 * @param {string} term The searched term
 * @param {object} dsiplay Display object used for rendering results
 * @param {object} actions Use to execute actions on plugin
 */
const plugin = ({ term, display, actions, settings, hide }) => {
  const match = term.match(PLUGIN_REGEX);

  if (match) {

    if (!settings.accessToken) {
      display({
        title: 'Configuration required',
        subtitle: 'Please set your Evernote access token in the Plugin settings',
        icon: icon,
        term: 'plugins evernote'
      });

      return;
    }

    const searchParts = match[1].split(' ');

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

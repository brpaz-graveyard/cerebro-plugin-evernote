
const Evernote = require('evernote');
const { memoize } = require('cerebro-tools');

const SEARCH_NOTES_MAX_RESULTS = 50;

const LIST_TAGS_MAX_RESULTS = 50;

const EVERNOTE_NOTE_LINK_WEB_FORMAT = '%evernoteUrl%/shard/%shardId%/nl/%userId%/%noteGuid%';

const EVERNOTE_NOTE_LINK_APP_FORMAT = 'evernote:///view/%userId%/%shardId%/%noteGuid%/%noteGuid%';

const EVERNOTE_PRODUCTION_URL = 'https://www.evernote.com';

const EVERNOTE_SANDBOX_URL = 'https://www.sandbox.evernote.com';

const TAGS_MEMOIZE_OPTIONS = {
  length: false,
  promise: 'then',
  maxAge: 5 * 60 * 1000,
  preFetch: true
};

const NOTEBOOKS_MEMOIZE_OPTIONS = {
  length: false,
  promise: 'then',
  maxAge: 5 * 60 * 1000,
  preFetch: true
};

const NOTE_CONTENTS_MEMOIZE_OPTIONS = {
  length: false,
  promise: 'then',
  maxAge: 5 * 60 * 1000,
  preFetch: true
};

class EvernoteService {
  constructor(token, sandbox) {
    this.client = new Evernote.Client({ token: token, sandbox: sandbox });
    this.sandbox = sandbox;
  }

  async searchNotes(term) {
    const filter = new Evernote.NoteStore.NoteFilter({
      words: term,
      order: Evernote.Types.NoteSortOrder.UPDATED,
      ascending: false,
    });

    const spec = new Evernote.NoteStore.NotesMetadataResultSpec({
      includeTitle: true,
      includeUpdated: true,
      includeCreated: true,
      includeNotebookGuid: true,
      includeTagGuids: true,
      includeAttributes: true,

    });

    const notes = await this.client.getNoteStore().findNotesMetadata(filter, 0, SEARCH_NOTES_MAX_RESULTS, spec);

    return notes;
  }

  /**
   * Get a list of tags from Evernote.
   * @param {string} filterTerm Optional term to filter the tags list.
   * @return {Promise}
   */
  async getTags(filterTerm) {

    let tags = await this.client.getNoteStore().listTags();

    if (filterTerm) {
      tags = tags.filter((tag) => {
        return tag.name.toLowerCase().startsWith(filterTerm.toLowerCase());
      });
    }

    return tags.slice(0, LIST_TAGS_MAX_RESULTS);
  }

  /**
   * Get all the user Notebooks from Evernote.
   * // TODO implement cache to file and memoize
   * @param {string} filterTerm Optional filter notebooks by name
   * @returns {Promise}
   */
  async getNotebooks(filterTerm) {
    let notebooks = await this.client.getNoteStore().listNotebooks();

    if (filterTerm) {
      notebooks = notebooks.filter((notebook) => {
        return notebook.name.toLowerCase().startsWith(filterTerm.toLowerCase());
      });
    }

    return notebooks;
  }

  /**
   * Returns the note content
   * @param {string} guid The note indentifier
   */
  async getNoteContent(guid) {
    const contents = await this.client.getNoteStore().getNoteContent(guid);

    return contents;
  }

  /**
   * Returns the current logged-in user data
   * @return {Promise}
   */
  async getUser() {
    const user = await this.client.getUserStore().getUser();

    return user;
  }

  /**
   * Builds a note url.
   *
   * @param {object} note Note object from Evernote SDK
   * @param {object} user User object from Evernote SDK
   * @param {boolean} appLink When to open the note in Evernote Application.
   * If false, it will open on Web client by default.
   *
   * @returns {string}
   */
  buildNoteUrl(note, user, appLink) {
    const baseUrl = this.sandbox ? EVERNOTE_SANDBOX_URL : EVERNOTE_PRODUCTION_URL;
    let noteUrl = '';

    if (appLink) {
      noteUrl = EVERNOTE_NOTE_LINK_APP_FORMAT
        .replace('%evernoteUrl%', baseUrl)
        .replace('%shardId%', user.shardId)
        .replace('%userId%', user.id)
        .replace(/%noteGuid%/g, note.guid);
    } else {
      noteUrl = EVERNOTE_NOTE_LINK_WEB_FORMAT
        .replace('%evernoteUrl%', baseUrl)
        .replace('%shardId%', user.shardId)
        .replace('%userId%', user.id)
        .replace(/%noteGuid%/g, note.guid);
    }

    return noteUrl;
  }
}

module.exports = EvernoteService;

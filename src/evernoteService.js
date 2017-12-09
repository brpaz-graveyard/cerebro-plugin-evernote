
const Evernote = require('evernote');
const { memoize } = require('cerebro-tools');

/**
 * Maximum number of results returned when doing a Notes Search.
 */
const LIST_NOTES_MAX_RESULTS = 50;

/**
 * Maximum number of results returned when doing a tags search
 */
const LIST_TAGS_MAX_RESULTS = 50;

/**
 * The format of the note url for the web client of Evernote.
 * Used when generating the "Note Link"
 */
const EVERNOTE_NOTE_LINK_WEB_FORMAT = '%evernoteUrl%/shard/%shardId%/nl/%userId%/%noteGuid%';

/**
 * The format of the note url for the app version of Evernote.
 * Used when generating the "Note Link"
 */
const EVERNOTE_NOTE_LINK_APP_FORMAT = 'evernote:///view/%userId%/%shardId%/%noteGuid%/%noteGuid%';

const EVERNOTE_PRODUCTION_URL = 'https://www.evernote.com';

const EVERNOTE_SANDBOX_URL = 'https://www.sandbox.evernote.com';

/**
 * user data cache configuration
 */
const USER_MEMOIZE_OPTIONS = {
  length: false,
  promise: 'then',
  maxAge: 5 * 60 * 1000,
  preFetch: true
};

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

/**
 * Evernote Service
 * This class wraps Evernote SDK to provide access to Evernote resources
 */
class EvernoteService {

  /**
   * Constructor
   * @param {string} token The Evernote "Developer token" needed to authenticate
   * requests to Evernote API.
   * @param {boolean} sandbox Flag that indicates if we are using the "Sandbox"
   * or "Production" Evernote environment
   */
  constructor(token, sandbox) {
    this.client = new Evernote.Client({ token: token, sandbox: sandbox });
    this.sandbox = sandbox;
  }

  /**
   * Searches notes in Evernote.
   * The returned notes are order by the most recent updated.
   * @param {string} term The search term
   * @returns {Promise}
   */
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
    });

    try {
      return await this.client.getNoteStore()
        .findNotesMetadata(filter, 0, LIST_NOTES_MAX_RESULTS, spec);
    } catch (error) {
      return this.handleErrors(error);
    }
  }

  /**
   * Get a list of tags from Evernote, optionally filtered by name.
   * @param {string} filterTerm term to filter the tags list.
   * @return {Promise}
   * @throws {Error}
   */
  async getTags(filterTerm) {

    try {

      let tags = await this.client.getNoteStore().listTags();

      if (filterTerm) {
        tags = tags.filter((tag) => {
          return tag.name.toLowerCase().startsWith(filterTerm.toLowerCase());
        });
      }

      return tags.slice(0, LIST_TAGS_MAX_RESULTS);

    } catch (error) {
      return this.handleErrors(error);
    }
  }

  /**
   * Get all the user Notebooks from Evernote.
   * // TODO implement cache to file and memoize
   * @param {string} filterTerm Optional filter notebooks by name
   * @returns {Promise}
   */
  async getNotebooks(filterTerm) {

    try {

      let notebooks = await this.client.getNoteStore().listNotebooks();

      if (filterTerm) {
        notebooks = notebooks.filter((notebook) => {
          return notebook.name.toLowerCase().startsWith(filterTerm.toLowerCase());
        });
      }

      return notebooks;

    } catch (error) {
      return this.handleErrors(error);
    }
  }

  /**
   * Returns the note content
   * @param {string} guid The note indentifier
   */
  async getNoteContent(guid) {

    try {

      return await this.client.getNoteStore().getNoteContent(guid);

    } catch (error) {
      return this.handleErrors(error);
    }
  }

  /**
   * Returns the current logged-in user data
   * @return {Promise}
   */
  async getUser() {
    return memoize(async () => {

      try {
        const user = await this.client.getUserStore().getUser();
        return user;
      } catch (error) {
        return this.handleErrors(error);
      }

    }, USER_MEMOIZE_OPTIONS)();
  }

  /**
   * Handles Evernote SDK Errors.
   * @param {object} error The Error object from Evernote
   * @returns {Error}
   */
  handleErrors(error) {

    console.error(error);

    if (error instanceof Evernote.Errors.EDAMUserException) {
      switch (error.errorCode) {
        case Evernote.Errors.EDAMErrorCode.BAD_DATA_FORMAT:
          if (error.parameter === 'authenticationToken') {
            throw new Error('Invalid access token. Please check your token is correct configured on Plugin settings');
          }
          break;
        case Evernote.Errors.EDAMErrorCode.AUTH_EXPIRED:
          throw new Error('Your Evernote token has expired. Please generate a new one to keep using this plugin');
        case Evernote.Errors.EDAMErrorCode.RATE_LIMIT_REACHED:
          throw new Error('Evernote rate limit reached. Please wait a little before using the plugin again.');
        default:
          break;
      }
    }

    throw new Error('An error occurred when fetching data from Evernote');
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

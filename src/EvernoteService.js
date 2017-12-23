
const Evernote = require('evernote');
const RequestTimeoutError = require('./errors/RequestTImeoutError');
const NodeCache = require('node-cache');

const _ = require('lodash');
const crypto = require('crypto');

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
 * The default time to timeout Evernote requests (in miliseconds)
 */
const DEFAULT_REQUEST_TIMEOUT = 15000;

const NOTES_CACHE_TTL = 3600; // 1h

const TAGS_CACHE_TTL = 7200; // 2h

const NOTEBOOKS_CACHE_TTL = 7200; // 2h

const USER_CACHE_TTL = 3600; // 1h

const NOTE_CONTENTS_CACHE_TTL = 7200; // 2h

let instance = null;

/**
 * Evernote Service
 * This class wraps Evernote SDK to provide access to Evernote resources
 */
class EvernoteService {

  /**
   * Singleton method.
   */
  static getInstance(token, sandbox) {

    if (!instance) {
      instance = new EvernoteService(token, sandbox);
    }

    return instance;
  }

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
    this.cache = new NodeCache({ stdTTL: 600 });
  }

  /**
   * Searches notes in Evernote.
   * The returned notes are order by the most recent updated.
   * @param {string} term The search term
   * @returns {Promise}
   */
  async searchNotes(term) {

    const cacheKey = crypto.createHash('md5').update(`notes_${term}`).digest('hex');
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

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
      const notes = await this.withTimeout(
        DEFAULT_REQUEST_TIMEOUT,
        this.client.getNoteStore()
          .findNotesMetadata(filter, 0, LIST_NOTES_MAX_RESULTS, spec)
      );

      this.cache.set(cacheKey, notes, NOTES_CACHE_TTL);

      return notes;

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

      const cacheKey = crypto.createHash('md5').update(`tags_${filterTerm}`).digest('hex');
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      let tags = await this.withTimeout(
        DEFAULT_REQUEST_TIMEOUT,
        this.client.getNoteStore().listTags()
      );

      if (filterTerm) {
        tags = tags.filter((tag) => {
          return tag.name.toLowerCase().startsWith(filterTerm.toLowerCase());
        });
      }

      tags = _.orderBy(tags, ['name'], ['asc']);

      tags = tags.slice(0, LIST_TAGS_MAX_RESULTS);

      this.cache.set(cacheKey, tags, TAGS_CACHE_TTL);

      return tags;

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

      const cacheKey = crypto.createHash('md5').update(`nb_${filterTerm}`).digest('hex');
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      let notebooks = await this.withTimeout(
        DEFAULT_REQUEST_TIMEOUT,
        this.client.getNoteStore().listNotebooks()
      );

      if (filterTerm) {
        notebooks = notebooks.filter((notebook) => {
          return notebook.name.toLowerCase().startsWith(filterTerm.toLowerCase());
        });
      }

      notebooks = _.orderBy(notebooks, ['name'], ['asc']);

      this.cache.set(cacheKey, notebooks, NOTEBOOKS_CACHE_TTL);

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

      const cacheKey = crypto.createHash('md5').update(`note_contents_${guid}`).digest('hex');
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const contents = await this.client.getNoteStore().getNoteContent(guid);

      this.cache.set(cacheKey, contents, NOTE_CONTENTS_CACHE_TTL);

      return contents;

    } catch (error) {
      return this.handleErrors(error);
    }
  }

  /**
   * Returns the current logged-in user data
   * @return {Promise}
   */
  async getUser() {
    try {

      const cacheKey = crypto.createHash('md5').update('user').digest('hex');
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const user = await this.withTimeout(
        DEFAULT_REQUEST_TIMEOUT,
        this.client.getUserStore().getUser()
      );

      this.cache.set(cacheKey, user, USER_CACHE_TTL);

      return user;

    } catch (error) {
      return this.handleErrors(error);
    }
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
    } else if (error instanceof RequestTimeoutError) {
      throw new Error('Evernote took too long to respond. Please try again.');
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

  /**
   * Helper function that allows to add timeouts to promises.
   * The Evernote API seems quite instable sometimes, so this is really needed to provide a better
   * Experience to the user.
   *
   * @param {integer} millis The number of miliseconds for a request to time out
   * @param {Promise} promise The promise to apply the timeout.
   */
  withTimeout(millis, promise) {
    const timeout = new Promise((resolve, reject) =>
      setTimeout(
        () => reject(new RequestTimeoutError('Request took too long to respond')),
        millis
      ));
    return Promise.race([
      promise,
      timeout
    ]);
  }
}

module.exports = EvernoteService;

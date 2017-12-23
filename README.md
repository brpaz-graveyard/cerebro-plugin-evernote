# cerebro-plugin-evernote

[![Build Status](https://travis-ci.org/brpaz/cerebro-plugin-evernote.svg?branch=master)](https://travis-ci.org/brpaz/cerebro-plugin-evernote)

> [Cerebro](http://cerebroapp.com) plugin for searching your [Evernote](https://www.evernote.com) notes.

![](demo.gif)


## Requirements

* Latest version of Cerebro installed on your Machine
* An [Evernote Account](https://www.evernote.com/Registration.action)
* A valid Evernode "Developer Token" to connect to Evernote API - You can get [here](https://www.evernote.com/api/DeveloperToken.action)

## Usage

* Install the plugin (type ```plugins evernote``` in Cerebro bar)
* After installing the plugin go to plugin settings and set the "Developer Token" for your account.

Then just type ```evernote``` in Cerebro bar to start using the plugin


### Available Commands

* ```evernote nb``` - List all your notebooks. Press "Tab" on an item from the list, will display all the notes from that notebook. (Max 50). After you can start typing to filter the results.
* ```evernote tags``` - Same behavior of notebooks but for tags.
* ```evernote <search_query>``` - Search your notes normally. You can use all the syntax supported by [Evernote Search Grammar](https://dev.evernote.com/doc/articles/search_grammar.php)


## Development

**Clone repo**

```
git clone https://github.com/brpaz/cerebro-plugin-evernote
```

**Install dependencies**

```
yarn install
```

**Launch the plugin**

```npm start```

- A symlink will be created between the plugin folder and the Cerebro plugins folder.
- You will need to reload your Cerebro settings (Right click on Cerebro tray icon -> Development -> Reload).
- You can use Cerebro Dev Tools to debug your plugin.


## Known issues

* The Evernote API hangs many times, mostly when listing tags and notebooks. If this happens just try again.
* When searching, the preview of the first result dont appear automatically. If this happen just select the 2nd result and go back to the first one.
* Filter by tags or notebooks with spaces in their names does not working properly.

## Related

* [Cerebro](http://github.com/KELiON/cerebro) – Plugin extracted from core Cerebro app.
* [cerebro-plugin](http://github.com/KELiON/cerebro-plugin) – Boilerplate to create Cerebro plugins.
* [Cerebro Plugin docs](https://github.com/KELiON/cerebro/tree/master/docs) - Official Cerebro Plugins documentation.

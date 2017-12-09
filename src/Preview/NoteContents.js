
const React = require('react');
const Frame = require('react-frame-component').default;
const styles = require('./styles.css');

/**
 * Main Preview Component
 */
class NoteContents extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      contents: props.contents,
    };
  }

  render() {
    return (
      <Frame>
        <div dangerouslySetInnerHTML={{ __html: this.state.contents }}></div>
      </Frame>
    );
  }
}

module.exports = NoteContents;

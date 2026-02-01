import React from 'react';

function UnknownInputResultView(props : {input:string}) {
    
    return <div className="result">
                        <div className="error">¯\_(ツ)_/¯ Sorry, I don't know what this means: <code>{props.input}</code></div>
                </div>;
}

export default UnknownInputResultView;

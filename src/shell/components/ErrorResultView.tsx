import React from 'react';

function ErrorResultView(props : {errorMessage:string}) {
    return <div className="result">
                <div className="error pre"><code>{props.errorMessage}</code></div>
        </div>;
}

export default ErrorResultView;

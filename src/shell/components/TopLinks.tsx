import React from 'react';
import { Icon, faEnvelope, faDonate, faGithub } from '../../core/components/icons';
import './TopLinks.css';
import cmd from '../cmd';

function TopLinks() {

    return <ul className="top-links">                
                <li>
                    <button type="button" onClick={onDonate} className='link-button'>
                        <Icon className='icon' icon={faDonate} size="lg" /><span className='link-text'>donate</span>
                    </button>
                </li>
                <li>
                    <a href="https://github.com/BorisLevitskiy/BitwiseCmd" target='_blank' rel="noreferrer"><Icon className="icon" icon={faGithub} size="lg" /><span className="link-text">github</span></a>
                </li>
                <li>
                    <a href="mailto:&#098;&#105;&#116;&#119;&#105;&#115;&#101;&#099;&#109;&#100;&#064;&#103;&#109;&#097;&#105;&#108;&#046;&#099;&#111;&#109;?subject=Feedback"><Icon className="icon" icon={faEnvelope} size="lg" /><span className="link-text">idea or feedback</span></a>
                </li>
    </ul>;
}

const onDonate = () => {
    cmd.execute('donate');
    return true;
}

export default TopLinks;
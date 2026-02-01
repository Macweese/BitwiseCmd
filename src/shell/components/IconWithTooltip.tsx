import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useRef, useState } from "react";
import "./IconWithTooltip.css";

export type IconWithToolTipProps = {
    icon: IconProp
}

function IconWithToolTip (props: React.PropsWithChildren<IconWithToolTipProps>)  {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const iconRef = useRef<HTMLSpanElement>(null);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({ visibility: 'hidden' });

    const updateTooltipPosition = () => {
        if (!tooltipRef.current || !iconRef.current) return;

        const iconRect = iconRef.current.getBoundingClientRect();
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let left = iconRect.right + 5;
        let top = iconRect.top;

        let positionLeft = false;
        // Check if tooltip would overflow on the right
        if (left + tooltipRect.width > viewportWidth) {
            // Try positioning to the left of the icon
            left = iconRect.left - tooltipRect.width - 5;
            positionLeft = true;
            // If it still doesn't fit, position it aligned to the right edge
            if (left < 0) {
                left = viewportWidth - tooltipRect.width - 10;
            }
        }

        // Check if tooltip would overflow on the bottom
        if (top + tooltipRect.height > viewportHeight) {
            // Position above the icon,
            // add additional 5-pixel padding to allow room above binary representation,
            // in case the tooltip is also placed on the left side
            top = iconRect.bottom - tooltipRect.height - (positionLeft ? (iconRect.height + 5) : 0);

            // If it still doesn't fit, align to bottom edge
            if (top < 0) {
                top = viewportHeight - tooltipRect.height - 10;
            }
        }

        // Ensure it doesn't overflow on the left
        if (left < 0) {
            left = 10;
        }

        // Ensure it doesn't overflow on the top
        if (top < 0) {
            top = 10;
        }

        setTooltipStyle({
            left: `${left}px`,
            top: `${top}px`,
            visibility: 'visible'
        });
    };

    const handleMouseEnter = () => {
        // First render hidden to measure, then position
        // This is to avoid sporadic repositioning
        setTooltipStyle({ visibility: 'hidden' });
        requestAnimationFrame(() => {
            updateTooltipPosition();
        });
    };

    const handleMouseLeave = () => {
        setTooltipStyle({ visibility: 'hidden' });
    };

    return <div className='tooltip-holder' onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <span className="tooltip-icon" ref={iconRef}>
            <FontAwesomeIcon icon={props.icon} />
        </span>

        <div
            className='tooltip solid-border solid-background'
            ref={tooltipRef}
            style={tooltipStyle}
        >
            {props.children}
        </div>
    </div>;
}

export default IconWithToolTip;
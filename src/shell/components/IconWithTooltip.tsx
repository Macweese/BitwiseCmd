import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { isValidElement, useLayoutEffect, useRef, useState } from "react";
import "./IconWithTooltip.css";

export type IconWithToolTipProps = {
    // An icon of the icon font, or one of our glyphs
    icon: IconProp | React.ReactElement,
    className?: string
}

type Size = { width: number, height: number };

// The position of a tooltip in the viewport. The tooltip goes to the right of its icon.
// If there is no room, it goes to the left of the icon or up. It always stays in the viewport.
export function getTooltipPosition(icon: DOMRect, tooltip: Size, viewport: Size) : { left: number, top: number } {
    let left = icon.right + 5;
    let top = icon.top;
    let isOnTheLeft = false;

    if (left + tooltip.width > viewport.width) {
        left = icon.left - tooltip.width - 5;
        isOnTheLeft = true;

        if (left < 0)
            left = viewport.width - tooltip.width - 10;
    }

    if (top + tooltip.height > viewport.height) {
        // On the left of the icon, the tooltip also goes above the row. Then it does not hide the bits.
        top = icon.bottom - tooltip.height - (isOnTheLeft ? icon.height + 5 : 0);

        if (top < 0)
            top = viewport.height - tooltip.height - 10;
    }

    return { left: left < 0 ? 10 : left, top: top < 0 ? 10 : top };
}

// A popover is in the top layer of the browser. No ancestor can clip it, and its fixed
// position is relative to the viewport. A browser without popovers shows the tooltip in its place.
function showInTopLayer(element: HTMLElement) {
    const popover = element as HTMLElement & { showPopover?: () => void };

    if (typeof popover.showPopover === 'function') {
        element.setAttribute('popover', 'manual');
        popover.showPopover();
    }
}

function IconWithToolTip (props: React.PropsWithChildren<IconWithToolTipProps>)  {
    const tooltipRef = useRef<HTMLDivElement>(null);
    const iconRef = useRef<HTMLSpanElement>(null);
    // The tooltip is in the document only while the pointer is on the icon
    const [isOpen, setIsOpen] = useState(false);

    // Set the position before the browser paints the tooltip
    useLayoutEffect(() => {
        const tooltip = tooltipRef.current;
        const icon = iconRef.current;

        if (!isOpen || !tooltip || !icon)
            return;

        showInTopLayer(tooltip);

        const viewport = { width: window.innerWidth, height: window.innerHeight };
        const { left, top } = getTooltipPosition(icon.getBoundingClientRect(), tooltip.getBoundingClientRect(), viewport);
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;

        const close = () => setIsOpen(false);
        const closeOnEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };

        document.addEventListener('keydown', closeOnEscape);
        // The tooltip has a fixed position. It does not move with its icon when the page scrolls.
        window.addEventListener('scroll', close, true);

        return () => {
            document.removeEventListener('keydown', closeOnEscape);
            window.removeEventListener('scroll', close, true);
        };
    }, [isOpen]);

    return <div className={props.className ? 'tooltip-holder ' + props.className : 'tooltip-holder'} onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
        <span className="tooltip-icon" ref={iconRef}>
            {isValidElement(props.icon) ? props.icon : <FontAwesomeIcon icon={props.icon} />}
        </span>

        {isOpen ? <div className='tooltip solid-border solid-background' role="tooltip" ref={tooltipRef}>{props.children}</div> : null}
    </div>;
}

export default IconWithToolTip;

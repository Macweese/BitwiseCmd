import React from 'react';
import './BinaryString.css';

export type BinaryStringViewProps = {
    allowFlipBits?: boolean;
    binaryString: string;
    onBitClicked?: (input: FlipBitEventArg) => void;
    // The number of bits at the left that only fill the number up to full bytes.
    // The stylesheet shows them only when the emphasis of bytes is on.
    bytePaddingBits?: number;
    className?: string;
    disableHighlight?: boolean,
    signBitIndex?: number,
    valueBitSize?: number
};

export type FlipBitEventArg = {
    bitIndex: number;
    binaryStringLength: number;
    $event: any;
    newBinaryString: any;
    isExtraBit: boolean
};

export default class BinaryStringView extends React.Component<BinaryStringViewProps> {
    render() {
        // One click handler for all bits. The bits are the direct children of this element.
        const onClick = this.props.allowFlipBits && this.props.onBitClicked
            ? (e: React.MouseEvent<HTMLElement>) => this.onClick(e)
            : undefined;

        return <span className={this.props.className} onClick={onClick}>{this.createBits()}</span>
    }

    onClick(e: React.MouseEvent<HTMLElement>) {
        const bit = e.target as HTMLElement;

        if (bit.parentElement !== e.currentTarget)
            return;

        this.onBitClick(Array.prototype.indexOf.call(e.currentTarget.children, bit), e);
    }

    onBitClick(index: number, e: any) {
        if (!this.props.allowFlipBits || !this.props.onBitClicked) {
            return;
        }

        const arr = this.props.binaryString.split('');
        arr[index] = arr[index] === '0' ? '1' : '0';
        const newBinaryString = arr.join('');

        this.props.onBitClicked({
            bitIndex: index, 
            binaryStringLength: this.props.binaryString.length,
            newBinaryString: newBinaryString, 
            $event: e,
            isExtraBit: index < this.firstValueBitIndex()
        });
    }

    // The index of the first bit that belongs to the value. The bits before it are padding.
    firstValueBitIndex(): number {
        const { binaryString, valueBitSize } = this.props;

        return valueBitSize !== null && valueBitSize !== undefined
            ? binaryString.length - valueBitSize
            : -1;
    }

    createBits(): JSX.Element[] {
        const { binaryString, signBitIndex } = this.props;
        const css = this.props.allowFlipBits ? ' flippable' : '';
        const disableHighlight = this.props.disableHighlight || false;
        const firstBitIndex = this.firstValueBitIndex();
        const bytePaddingBits = this.props.bytePaddingBits || 0;
        const bits: JSX.Element[] = [];

        for (let i = 0; i < binaryString.length; i++) {
            const c = binaryString[i];
            let className = c === '1' ? `one${css}` : `zero${css}`;
            let tooltip: string | undefined;

            if (i < firstBitIndex)
                className += ' extra-bit';

            if (i === signBitIndex) {
                className += ' accent1';
                tooltip = 'Signature bit. 0 means a positive number and 1 means a negative.'
            }

            if (disableHighlight)
                className = css;

            if (i < bytePaddingBits)
                className += ' byte-padding';

            // The key counts from the right. Thus a bit keeps its element when the padding changes.
            bits.push(<span className={className} title={tooltip} key={binaryString.length - i}>{c}</span>);
        }

        return bits;
    }
}

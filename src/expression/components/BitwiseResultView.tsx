import React, {useEffect, useRef, useState} from 'react';
import formatter from '../../core/formatter';
import BinaryStringView, { FlipBitEventArg as BitClickedEventArg } from '../../core/components/BinaryString';
import BitwiseResultViewModel from './BitwiseResultViewModel';
import { Expression, ExpressionElement } from '../expression-interfaces';
import {Operator, Operand, ListOfNumbers, BitwiseOperation} from '../expression';
import calc from '../../core/calc';
import { Integer } from '../../core/Integer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRotateLeft as iconUndo } from '@fortawesome/free-solid-svg-icons';
import { faCircleQuestion as iconTip } from '@fortawesome/free-regular-svg-icons';
import loglevel from 'loglevel';
import IconWithToolTip from '../../shell/components/IconWithTooltip';

type BitwiseResultViewProps = {
    expression: Expression;
    emphasizeBytes: boolean;
    annotateTypes: boolean,
    dimExtraBits: boolean
}

type BitwiseResultViewState = {

}

export default class BitwiseResultView extends React.Component<BitwiseResultViewProps, BitwiseResultViewState>  {
    maxSeenLengthNumberOfBits: number;

    constructor(props: BitwiseResultViewProps) {
        super(props);
        this.state = {};
        this.maxSeenLengthNumberOfBits = 0;
    }

    render() {

        let model: BitwiseResultViewModel | null = null
        const allowSignChange = this.props.expression instanceof ListOfNumbers;


        try {
            model = BitwiseResultViewModel.createModel(this.props.expression, this.props.emphasizeBytes, this.props.annotateTypes);
        }
        catch (err) {
            const text = (err as any).message;
            return <div className='error'>Error: {text}</div>
        }

        const rows = this.getRows(model!, allowSignChange);

        let css = "expression";

        if(this.props.dimExtraBits)
            css += " dim-extra-bits";

        return <React.Fragment>
                    <table className={css}>
                    <tbody>
                        {rows}
                    </tbody>
                </table>
        </React.Fragment>
    }

    getRows(model: BitwiseResultViewModel, allowSignChange: boolean): JSX.Element[] {

        const maxAnnotatedSize = this.props.annotateTypes ? model.items.map(i => i.maxBitSize).sort().reverse()[0] :0;

        this.maxSeenLengthNumberOfBits = Math.max(model.maxNumberOfBits, this.maxSeenLengthNumberOfBits);

        const finalMaxBits = Math.max(this.maxSeenLengthNumberOfBits, maxAnnotatedSize);

        // For BitwiseOperation, get the root node ID to identify the final result
        let rootNodeId: number | null = null;
        if (this.props.expression instanceof BitwiseOperation && this.props.expression.tree) {
            rootNodeId = this.props.expression.tree.root.id;
        }

        return model.items.map((item, i) => {
            // Check if this row represents the final result
            // It's the final result if:
            // 1. It's a BitwiseOperation result row (has '=' operator)
            // 2. The operand ID matches the root node ID
            const operand = item.expressionElement.getUnderlyingOperand();
            const isFinalResult = rootNodeId !== null &&
                item.operator === '=' &&
                operand.id === rootNodeId;

            return (
                <ExpressionElementTableRow
                    key={i}
                    operator={item.operator}
                    css={item.css}
                    bitSize={item.maxBitSize}
                    allowFlipBits={item.allowFlipBits}
                    allowSignChange={allowSignChange}
                    expressionItem={item.expressionElement}
                    emphasizeBytes={this.props.emphasizeBytes}
                    maxNumberOfBits={finalMaxBits}
                    annotateTypes={this.props.annotateTypes}
                    expression={this.props.expression}
                    isFinalResult={isFinalResult}
                    onValueChanged={() => this.onValueChanged()} />
            );
        });
    }

    onValueChanged() {
        loglevel.debug("onValueChanged()");
        this.forceUpdate();
    }
}

type ExpressionElementRowProps = {
    operator: string,
    css: string,
    bitSize: number,
    maxNumberOfBits: number,
    emphasizeBytes: boolean,
    allowFlipBits: boolean,
    allowSignChange: boolean,
    expressionItem: ExpressionElement,
    onValueChanged: any,
    annotateTypes: boolean,
    expression: Expression,
    isFinalResult: boolean
};

class ExpressionElementTableRow extends React.Component<ExpressionElementRowProps> {

    infoWasShown: boolean = false;
    originalValue: Integer;
    scalar: Operand;

    constructor(props: ExpressionElementRowProps) {
        super(props);
        this.state = { operand: null };
        this.scalar = this.props.expressionItem.getUnderlyingOperand();
        this.originalValue = this.scalar.value;
    }

    render() {
        const { operator, css, maxNumberOfBits, emphasizeBytes, allowFlipBits, annotateTypes } = this.props;
        const scalar = this.props.expressionItem.evaluate();
        const bin = formatter.numberToString(scalar.value, 'bin', maxNumberOfBits);
        const signBitIndex = scalar.value.signed && bin.length >= scalar.value.maxBitSize ? bin.length - scalar.value.maxBitSize : -1;
        const valueSize = annotateTypes ? scalar.value.maxBitSize : calc.numberOfBitsDisplayed(scalar.value);
        const minWidth = scalar.value.maxBitSize === 64 ?  195 : 107; // TODO magic numbers associated with this specific font...

        return <tr className={"row-with-bits " + css}>
            <td className="operator" style={{ minWidth: `${minWidth + 26}px` }}>{operator}</td>
            {/*<td className="label" >*/}
            {/*    <span>{this.getLabel()}</span>*/}
            {/*</td>*/}
            <td className="label" style={{ minWidth: `${minWidth}px` }}>{this.getLabel()}
            </td>
            <td className="bin">
                <BinaryStringView
                    emphasizeBytes={emphasizeBytes}
                    binaryString={bin}
                    allowFlipBits={allowFlipBits}
                    signBitIndex={signBitIndex}
                    valueBitSize={valueSize}
                    onBitClicked={args => this.onBitClicked(args)} />
            </td>
            <td className="negative">{this.getSign()}</td>
            <td className="other" style={{ minWidth: `${minWidth}px`}}>{this.getAlternative()}</td>{/* TODO: inline 'style=' ? */}
            <td className="info accent1" style={{ minWidth: this.props.annotateTypes ? 132 : 0 }} data-test-name='ignore'>{this.props.annotateTypes ? this.getInfo() : null}</td>{/* TODO: inline 'style=' ? */}
            <td className='tooltips' data-test-name='ignore'>
                {this.getTooltips()}
            </td>
            <td className='undo' data-test-name='ignore'>
                {this.getUndoButton()}
            </td>
        </tr>;
    }

    getTooltips(): React.ReactNode {
        const currentValue = this.scalar.value;

        // Show tooltip for negative numbers (both intermediate and final results)
        if (currentValue.value < 0) {
            return (
                <IconWithToolTip key={`tooltip-neg-${currentValue.value.toString()}`} icon={iconTip}>
                    <div className='accent1 tooltip-header'>Two's Complement</div>
                    <p>
                        This is a negative number. Its binary representation is <u>inverted</u> using <strong>Two's Complement</strong> operation.
                    </p>
                    {this.props.annotateTypes ? null : (
                        <p>
                            To see full in-memory binary representation, go to <b>Settings</b> and enable <b>Annotate Data Types</b> toggle.
                        </p>
                    )}
                </IconWithToolTip>
            );
        }

        return null;
    }

    getUndoButton(): React.ReactNode {
        const currentValue = this.scalar.value;
        const { isFinalResult } = this.props;

        // Show undo button only for non-final results that have changed
        // (Final results are calculated, not directly editable)
        if (!isFinalResult && !this.originalValue.isTheSame(currentValue)) {
            return (
                <button
                    key={`undo-${currentValue.value.toString()}`}
                    title='Undo all changes'
                    className='undo'
                    data-control="undo"
                    onClick={() => this.undo()}
                >
                    <FontAwesomeIcon icon={iconUndo} />
                </button>
            );
        }

        return null;
    }

    getControlButtons(): React.ReactNode {

        const buttons = [];
        const currentValue = this.scalar.value;
        const { isFinalResult } = this.props;

        // Show tooltip for negative numbers (both intermediate and final results)
        if (currentValue.value < 0) {
            buttons.push(
                <IconWithToolTip key={`tooltip-neg-${currentValue.value.toString()}`} icon={iconTip}>
                    <div className='accent1 tooltip-header'>Two's Complement</div>
                    <p>
                        This is a negative number. Its binary representation is <u>inverted</u> using <strong>Two's Complement</strong> operation.
                    </p>
                    {this.props.annotateTypes ? null : (
                        <p>
                            To see full in-memory binary representation, go to <b>Settings</b> and enable <b>Annotate Data Types</b> toggle.
                        </p>
                    )}
                </IconWithToolTip>
            );
        }

        // Show undo button only for non-final results that have changed
        // (Final results are calculated, not directly editable)
        if (!isFinalResult && !this.originalValue.isTheSame(currentValue)) {
            buttons.push(
                <button
                    key={`undo-${currentValue.value.toString()}`}
                    title='Undo all changes'
                    className='undo'
                    data-control="undo"
                    onClick={() => this.undo()}
                >
                    <FontAwesomeIcon icon={iconUndo} />
                </button>
            );
        }

        return <React.Fragment>{buttons}</React.Fragment>;
    }

    getLabel(): string {

        // For expressions like |~2 
        // TODO: find a better way...
        if (this.props.expressionItem.isOperator) {
            const ex = this.props.expressionItem as Operator;
            return ex.operator + this.getLabelString(ex.getUnderlyingOperand());
        }

        return this.getLabelString(this.props.expressionItem.getUnderlyingOperand());
    }

    getAlternative() {

        if (this.props.expressionItem.isOperator) {
            const ex = this.props.expressionItem as Operator;
            const res = ex.evaluate();

            return formatter.numberToString(res.value, res.base);
        }

        const v = this.props.expressionItem.evaluate();
        const altBase = formatter.getAlternativeBase(v.base);
        let string = formatter.numberToString(v.value, altBase);
        return string.startsWith('-') ? string.substring(1) : string;
    }

    getSign() {
        return this.scalar.value.num() < 0 ? "-" : ""
    }

    getLabelString(op: Operand): string {
        return formatter.numberToString(op.value, op.base === 'bin' ? 'dec' : op.base);
    }

    undo() {
        // Use tree update mechanism for BitwiseOperation
        const expr = this.props.expression;
        if (expr instanceof BitwiseOperation && expr.tree) {
            expr.tree.updateOperand(this.scalar.id, this.originalValue);
            this.props.onValueChanged();
        } else {
            // Fallback for ListOfNumbers
            this.changeValue(this.originalValue);
            this.props.onValueChanged();
        }
    }

    onBitClicked(args: BitClickedEventArg) {
        const { bitIndex, binaryStringLength } = args;
        const maxBitSize = this.scalar.value.maxBitSize;
        const rightIndex = binaryStringLength - bitIndex;

        if (rightIndex <= maxBitSize) {
            const pad = this.scalar.value.maxBitSize - binaryStringLength;
            const newValue = calc.flipBit(this.scalar.value, pad + bitIndex);

            // UPDATE: Use the tree's update mechanism
            const expr = this.props.expression;
            if (expr instanceof BitwiseOperation && expr.tree) {
                expr.tree.updateOperand(this.scalar.id, newValue);
                // Force complete re-render with fresh tree evaluation
                this.props.onValueChanged();
            } else {
                // Fallback for ListOfNumbers
                this.changeValue(newValue);
            }
            return;
        }

        const space = (binaryStringLength - bitIndex - maxBitSize);
        this.changeValue(calc.addSpace(this.scalar.value, space));
    }

    onChangeSign() {

        var op = this.props.expressionItem.getUnderlyingOperand();

        this.changeValue(op.value.signed ? op.value.toUnsigned() : op.value.toSigned());

        this.forceUpdate();
    }

    changeValue(newValue: Integer) {
        this.scalar.setValue(newValue);
        this.props.onValueChanged();
    }

    getInfo() {

        const op = this.props.expressionItem.getUnderlyingOperand();
        const { allowSignChange } = this.props;
        const currentValue = op.value; // Get current value

        this.infoWasShown = true;

        const children = [];
        let title = `BitwiseCmd treats this number as ${currentValue.maxBitSize}-bit integer`;
        let text = `${currentValue.maxBitSize}-bit `;

        const signedStr = currentValue.signed ? 'signed' : 'unsigned';
        const signedOther = currentValue.signed ? 'unsigned' : 'signed';
        const signedButtonTitle = `Click to change to ${signedOther} preserving the same bits`;

        if (op.label.length > 0) {
            text += " (converted)";
            title += ". This number was converted to facilitate bitwise operation with an operand of a different type.";
        }

        children.push(<span key="size-info" title={title} style={{ cursor: "help" }}>{text.trim()}</span>);

        if (allowSignChange) {
            children.push(
                <button
                    key="sign-button"
                    className='accent1 link-button'
                    title={signedButtonTitle}
                    onClick={() => this.onChangeSign()}
                >
                    {signedStr}
                </button>
            );
        } else {
            children.push(<span key="sign-text" className='accent1'>&nbsp;{signedStr}</span>);
        }

        return <React.Fragment>{children}</React.Fragment>;
    }
}

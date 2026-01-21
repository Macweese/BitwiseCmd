import { Expression, ExpressionElement } from "./expression-interfaces";
import { IntermediateStep } from "./PrattParser";
import { ExpressionTree } from "./ExpressionTree";

export default class BitwiseOperation implements Expression {
    expressionString: string;
    children: ExpressionElement[];
    steps: IntermediateStep[];
    tree: ExpressionTree | null;

    constructor(expressionString: string, children: ExpressionElement[], steps?: IntermediateStep[]) {
        this.expressionString = expressionString;
        this.children = children;
        this.steps = steps || [];

        // Build expression tree if we have steps
        this.tree = this.steps.length > 0 ? ExpressionTree.fromPrattSteps(this.steps) : null;
    }
}
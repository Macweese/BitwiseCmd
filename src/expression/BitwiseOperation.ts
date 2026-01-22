import { Expression, ExpressionElement } from "./expression-interfaces";
import { IntermediateStep } from "./PrattParser";
import {ExpressionNode, ExpressionTree} from "./ExpressionTree";

export default class BitwiseOperation implements Expression {
    expressionString: string;
    children: ExpressionElement[];
    steps: IntermediateStep[];
    tree: ExpressionTree | null;

    constructor(expressionString: string, children: ExpressionElement[], steps?: IntermediateStep[], rootNode?: ExpressionNode) {
        this.expressionString = expressionString;
        this.children = children;
        this.steps = steps || [];

        // Use provided root node or build from steps
        this.tree = rootNode ? new ExpressionTree(rootNode) : null;
    }
}
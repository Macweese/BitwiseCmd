import { Expression } from "./expression-interfaces";
import { ExpressionNode, ExpressionTree } from "./ExpressionTree";
import Operand from "./Operand";

export default class BitwiseOperation implements Expression {
    expressionString: string;
    tree: ExpressionTree;

    constructor(expressionString: string, root: ExpressionNode) {
        this.expressionString = expressionString;
        this.tree = new ExpressionTree(root);
    }

    evaluate(): Operand {
        return this.tree.root.evaluate();
    }
}

import { CmdShell, ICommandHandler } from "./cmd";

describe("CmdShell", () => {
    it("simple command", () => {

        var handler = {
            test1() { },
            test2() { }
        };

        jest.spyOn(handler, "test1");
        jest.spyOn(handler, "test2");

        var sut = new CmdShell();
        sut.command("test1", handler.test1);

        sut.execute("test1");

        expect(handler.test1).toHaveBeenCalled();
        expect(handler.test2).not.toHaveBeenCalled();
    });

    it("unknown command", () => {   
        var sut = new CmdShell();
        sut.execute("test1");
    });

    it("object handler", () => {   

        var handler = {
            canHandle: function(input: string) : boolean { return input === "test2"; },
            handle: function (input: string)  { }
        };

        jest.spyOn(handler, "handle");

        var sut = new CmdShell();
        sut.command(handler);

        sut.execute("test1");

        expect(handler.handle).not.toHaveBeenCalled();

        sut.execute("test2");

        expect(handler.handle).toHaveBeenCalled();
    });
})
describe("commands from a link", () => {
    const handlers = () => {
        const calls: string[] = [];
        const errors: string[] = [];
        const sut = new CmdShell();
        sut.command("safe", () => calls.push("safe"), { runsFromLink: true });
        sut.command("unsafe", () => calls.push("unsafe"));
        sut.command({ runsFromLink: true, canHandle: (i: string) => i === "safe object", handle: () => calls.push("safe object") });
        sut.command({ canHandle: (i: string) => i === "unsafe object", handle: () => calls.push("unsafe object") });
        sut.onError((input, err) => errors.push(err.message));
        return { sut, calls, errors };
    };

    it("run only when their handler permits it", () => {
        const { sut, calls, errors } = handlers();

        ["safe", "unsafe", "safe object", "unsafe object"].forEach(c => sut.execute(c, { doNotTrack: true, fromLink: true }));

        expect(calls).toEqual(["safe", "safe object"]);
        expect(errors).toEqual([
            'A link cannot run the command "unsafe", because it can change your settings. To run it, type it.',
            'A link cannot run the command "unsafe object", because it can change your settings. To run it, type it.',
        ]);
    });

    it("all run when the user types them", () => {
        const { sut, calls, errors } = handlers();

        ["safe", "unsafe", "safe object", "unsafe object"].forEach(c => sut.execute(c, { doNotTrack: false }));

        expect(calls).toEqual(["safe", "unsafe", "safe object", "unsafe object"]);
        expect(errors).toEqual([]);
    });
});

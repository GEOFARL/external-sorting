import FileHandler from '../src/FileHandler';
import RunsHandler from '../src/RunsHandler';
import fs from 'fs';

jest.mock('fs', () => ({
  statSync: jest.fn(() => 100),
  createWriteStream: jest.fn(() => ({
    end: jest.fn(),
    once: jest.fn(),
  })),
  openSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  promises: jest.fn(),
}));

describe('FileHandler', () => {
  let fileHandler: FileHandler;

  beforeEach(() => {
    fileHandler = new FileHandler('/path/to/source.txt', 2, 3);
  });

  afterEach(() => {
    // jest.resetAllMocks();
  });

  describe('initRuns', () => {
    it('should initialize source and destination run handlers', () => {
      expect(fileHandler.getSrcRunHandlers().length).toBe(1);
      expect(fileHandler.getDestRunHandlers().length).toBe(3);
    });

    it('should not add a source run handler when the option is disabled', () => {
      fileHandler = new FileHandler('/path/to/source.txt', 2, 3, {
        addSrcRunHandler: false,
      });
      expect(fileHandler.getSrcRunHandlers().length).toBe(0);
    });
  });

  describe('getSrcRunHandlers', () => {
    it('should return source run handlers', () => {
      const srcRunHandlers = fileHandler.getSrcRunHandlers();
      expect(srcRunHandlers.length).toBe(1);
      expect(srcRunHandlers[0]).toBeInstanceOf(RunsHandler);
    });

    it('should create a new run handler when passes is 0', () => {
      const srcRunHandlers = fileHandler.getSrcRunHandlers(0);
      expect(srcRunHandlers.length).toBe(1);
      expect(srcRunHandlers[0]).toBeInstanceOf(RunsHandler);
    });

    it('should create a new run handler when passes is 0 and presorted is true', () => {
      const srcRunHandlers = fileHandler.getSrcRunHandlers(0, true);
      expect(srcRunHandlers.length).toBe(1);
      expect(srcRunHandlers[0]).toBeInstanceOf(RunsHandler);
    });
  });

  describe('switchSrcAndDest', () => {
    it('should reset destination run handlers and switch source and destination', async () => {
      const resetMock = jest.fn(() => Promise.resolve());
      fileHandler.getDestRunHandlers().forEach((handler) => {
        handler.reset = resetMock;
      });

      await fileHandler.switchSrcAndDest();

      expect(resetMock).toHaveBeenCalledTimes(3);
      expect(fileHandler.getSrcRunHandlers().length).toBe(3);
      expect(fileHandler.getDestRunHandlers().length).toBe(1);
    });
  });

  describe('moveToNextRun', () => {
    it('should update run numbers for both source and destination run handlers', () => {
      const updateRunNumberMock = jest.fn();
      fileHandler.getSrcRunHandlers().forEach((handler) => {
        handler.updateRunNumber = updateRunNumberMock;
      });
      fileHandler.getDestRunHandlers().forEach((handler) => {
        handler.updateRunNumber = updateRunNumberMock;
      });

      fileHandler.moveToNextRun();

      expect(updateRunNumberMock).toHaveBeenCalledTimes(4);
    });
  });

  describe('resetFiles', () => {
    it('should reset destination run handlers when dest is true', async () => {
      const resetFileContentsMock = jest.fn();
      fileHandler.getDestRunHandlers().forEach((handler) => {
        handler.resetFileContents = resetFileContentsMock;
      });

      await fileHandler.resetFiles(true);

      expect(resetFileContentsMock).toHaveBeenCalledTimes(3);
    });

    it('should reset source run handlers when dest is false', async () => {
      const resetFileContentsMock = jest.fn(() => Promise.resolve());
      fileHandler.getDestRunHandlers().forEach((handler) => {
        handler.resetFileContents = resetFileContentsMock;
      });

      await fileHandler.resetFiles(true);

      expect(resetFileContentsMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('cleanUp', () => {
    it('should remove temporary directory and file if it exists', () => {
      fs.existsSync = jest.fn().mockReturnValueOnce(true);
      fs.rmSync = jest.fn().mockImplementation(() => {});

      fileHandler.cleanUp();

      expect(fs.existsSync).toHaveBeenCalledTimes(1);
      expect(fs.rmSync).toHaveBeenCalledTimes(2);
    });

    it('should not attempt to remove the temporary file if it does not exist', () => {
      fs.existsSync = jest.fn().mockReturnValue(false);
      fs.rmSync = jest.fn().mockImplementation(() => {});

      fileHandler.cleanUp();

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.rmSync).toHaveBeenCalledTimes(1);
    });
  });

  describe('setTempSrcFilePath', () => {
    it('should set the temporary source file path', () => {
      fileHandler.setTempSrcFilePath('/path/to/temp/source.txt');
      expect(fileHandler.getTempSrcFilePath()).toBe('/path/to/temp/source.txt');
    });
  });

  describe('moveResultFile', () => {
    it('should move the result file to the destination directory', async () => {
      fs.existsSync = jest
        .fn()
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      fs.promises.rename = jest.fn().mockResolvedValue(undefined);

      await fileHandler.moveResultFile('/path/to/source.txt');

      expect(fs.promises.rename).toHaveBeenCalledWith(
        '/path/to/source.txt',
        expect.anything()
      );
    });
  });
});

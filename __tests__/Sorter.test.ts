import Sorter from '../src/Sorter';
import { SortingTechnique } from '../src/types';
import FileHandler from '../src/FileHandler';
import Reader from '../src/Reader';
import Writer from '../src/Writer';
import RunsHandler from '../src/RunsHandler';

jest.mock('../src/FileHandler');
jest.mock('../src/Reader');
jest.mock('../src/Writer');
jest.mock('../src/RunsHandler');

jest.mock('fs');

describe('Sorter', () => {
  let sorter: Sorter;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with NATURAL_MERGE technique', () => {
      sorter = new Sorter(
        '/path/to/file.txt',
        SortingTechnique.NATURAL_MERGE,
        false
      );
      expect(sorter['fileHandler']).toBeInstanceOf(FileHandler);
    });

    it('should initialize with MULTI_WAY_MERGE technique', () => {
      sorter = new Sorter(
        '/path/to/file.txt',
        SortingTechnique.MULTI_WAY_MERGE,
        false
      );
      expect(sorter['fileHandler']).toBeInstanceOf(FileHandler);
    });
  });

  describe('sort', () => {
    it('should call naturalSort for NATURAL_MERGE', async () => {
      sorter = new Sorter(
        '/path/to/file.txt',
        SortingTechnique.NATURAL_MERGE,
        false
      );
      sorter['naturalSort'] = jest.fn();
      await sorter.sort();
      expect(sorter['naturalSort']).toHaveBeenCalled();
    });

    it('should call multiWayMergeSort for MULTI_WAY_MERGE', async () => {
      sorter = new Sorter(
        '/path/to/file.txt',
        SortingTechnique.MULTI_WAY_MERGE,
        false
      );
      sorter['multiWayMergeSort'] = jest.fn();
      await sorter.sort();
      expect(sorter['multiWayMergeSort']).toHaveBeenCalled();
    });
  });

  describe('sortRawChunk', () => {
    it('should sort a raw chunk', () => {
      sorter = new Sorter(
        '/path/to/file.txt',
        SortingTechnique.NATURAL_MERGE,
        false
      );
      const sortedChunk = sorter['sortRawChunk']('5 1 3 2\n7 6 4\n');
      expect(sortedChunk).toEqual('1 2 3 4 5 6 7\n');
    });
  });

  describe('preprocessFile', () => {
    it('should preprocess the file with sorting', async () => {
      sorter = new Sorter(
        '/path/to/file.txt',
        SortingTechnique.NATURAL_MERGE,
        false
      );
      const readerInstance = new Reader('/path/to/file.txt');
      const writerInstance = new Writer('/path/to/file.txt');
      jest.mocked(Reader).mockImplementation(() => readerInstance);
      jest.mocked(Writer).mockImplementation(() => writerInstance);

      readerInstance.hasNumbers = jest
        .fn()
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);
      readerInstance.getChunk = jest
        .fn()
        .mockReturnValueOnce('5 1 3 2\n7 6 4\n')
        .mockReturnValueOnce('8 9\n');
      writerInstance.write = jest
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      await sorter['preprocessFile']();

      expect(Reader).toHaveBeenCalledWith(
        '/path/to/file.txt',
        expect.any(Number)
      );
      expect(Writer).toHaveBeenCalledWith(expect.any(String));
      expect(readerInstance.hasNumbers).toHaveBeenCalledTimes(3);
      expect(readerInstance.getChunk).toHaveBeenCalledTimes(2);
      expect(writerInstance.write).toHaveBeenCalledTimes(2);
      expect(writerInstance.end).toHaveBeenCalledTimes(1);
    });
  });

  describe('naturalSort', () => {
    it('should not call preprocessFile if isPresorted is false', async () => {
      sorter = new Sorter(
        '/path/to/file.txt',
        SortingTechnique.NATURAL_MERGE,
        false
      );
      sorter['preprocessFile'] = jest.fn();

      const srcHandler = new RunsHandler('/path/to/file.txt');
      srcHandler['isEOF'] = jest.fn(() => true);

      sorter['fileHandler'] = {
        getTempSrcFilePath: jest
          .fn()
          .mockReturnValueOnce('/path/to/temp_file.txt'),
        getSrcRunHandlers: jest.fn(() => [srcHandler, srcHandler]),
        getDestRunHandlers: jest.fn(() => [srcHandler, srcHandler]),
        resetFiles: jest.fn(),
        switchSrcAndDest: jest.fn(),
        cleanUp: jest.fn(),
      } as unknown as FileHandler;

      await sorter['naturalSort']();

      expect(sorter['preprocessFile']).not.toHaveBeenCalled();
      expect(sorter['fileHandler'].getTempSrcFilePath).not.toHaveBeenCalled();
    });
  });
});

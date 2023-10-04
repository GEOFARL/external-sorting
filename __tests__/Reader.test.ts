import Reader from '../src/Reader';
import * as fs from 'fs';

// Mock fs functions
jest.mock('fs', () => ({
  openSync: jest.fn(),
  statSync: jest.fn(),
  existsSync: jest.fn(() => true),
  read: jest.fn(),
  closeSync: jest.fn(),
}));

describe('Reader', () => {
  let reader: Reader;

  beforeEach(() => {
    // Mock fs functions
    (fs.openSync as jest.Mock).mockReturnValue(1);
    (fs.statSync as jest.Mock).mockReturnValue({ size: 100 } as fs.Stats);

    reader = new Reader('test-file.txt');
  });

  afterEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should create a Reader instance', () => {
    expect(reader).toBeInstanceOf(Reader);
  });

  it('should read data', async () => {
    // Mock read function to return data
    // eslint-disable-next-line
    const mockGetChunk = jest.fn(() => '12454');
    //eslint-disable-next-line
    reader.getChunk = mockGetChunk as any;

    const mockIsEOF = jest
      .fn()
      .mockImplementationOnce(() => false)
      .mockImplementationOnce(() => true);
    reader['isEOF'] = mockIsEOF;
    await reader.readData();
    expect(reader['numbers']).toEqual([[12454]]);
  });

  it('should get a number', async () => {
    // Mock readData to set test numbers
    reader['numbers'] = [[1, 2, 3]];

    const number = await reader.getNumber();
    expect(number).toBe(1);
  });

  it('should check if there are numbers', () => {
    // Initially, there are no numbers
    reader['eof'] = true;
    expect(reader.hasNumbers()).toBe(false);

    // Mock numbers to have some data
    reader['numbers'] = [[1, 2, 3]];

    // Now, there are numbers
    expect(reader.hasNumbers()).toBe(true);
  });

  it('should reset the reader', () => {
    reader.reset();

    // Check if flags are reset
    expect(reader['eof']).toBe(false);
    expect(reader['pos']).toBe(0);
    expect(reader['leftOvers']).toBe('');
    expect(reader['numbers']).toEqual([]);
  });

  it('should get the file size', () => {
    const fileSize = reader.getFileSize();
    expect(fileSize).toBe(100);
  });

  it('should split a line on the last space', () => {
    const line = '1 2 3 4';
    const result = Reader.splitOnLastSpace(line);
    expect(result).toEqual(['1 2 3', '4']);
  });
});

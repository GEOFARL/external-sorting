import RunsHandler from '../src/RunsHandler';
import Reader from '../src/Reader';
import Writer from '../src/Writer';

// Mock Reader and Writer classes
jest.mock('../src/Reader');
jest.mock('../src/Writer');

describe('RunsHandler', () => {
  let runsHandler: RunsHandler;

  beforeEach(() => {
    // Mock Reader and Writer instances
    const mockReader = new Reader('test-file.txt');
    const mockWriter = new Writer('test-file.txt');

    // Create a RunsHandler instance with mocked dependencies
    runsHandler = new RunsHandler('test-file.txt');
    runsHandler['reader'] = mockReader;
    runsHandler['writer'] = mockWriter;
  });

  afterEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
  });

  it('should check if EOF is reached', () => {
    (runsHandler['reader'].hasNumbers as jest.Mock).mockReturnValueOnce(false);
    const eof = runsHandler.isEOF();
    expect(eof).toBe(true);
  });

  it('should copy a run from another handler', async () => {
    const anotherHandler = new RunsHandler('another-file.txt');
    anotherHandler.getNumber = jest
      .fn()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);
    anotherHandler['isEOR'] = jest
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await runsHandler.copyRun(anotherHandler);

    // Ensure the writer's writeNumber method was called with the expected values
    expect(runsHandler['writer'].writeNumber).toHaveBeenCalledWith(1);
    expect(runsHandler['writer'].writeNumber).toHaveBeenCalledWith(2);
    expect(runsHandler['writer'].write).toHaveBeenCalledWith('\n');
  });

  it('should get a number from the reader', async () => {
    (runsHandler['reader'].getNumber as jest.Mock).mockResolvedValueOnce(42);
    const number = await runsHandler.getNumber();
    expect(number).toBe(42);
  });

  it('should write a newline character', async () => {
    await runsHandler.writeNL();
    expect(runsHandler['writer'].write).toHaveBeenCalledWith('\n');
  });

  it('should copy a number from another handler', async () => {
    (runsHandler['reader']['isEOF'] as jest.Mock).mockResolvedValueOnce(false);
    (runsHandler['reader'].getNumber as jest.Mock).mockResolvedValueOnce(99);

    const anotherHandler = new RunsHandler('another-file.txt');
    anotherHandler.getNumber = jest.fn().mockResolvedValueOnce(99);
    anotherHandler['isEOR'] = jest.fn().mockResolvedValueOnce(false);

    await runsHandler.copyNumber(anotherHandler);
    expect(runsHandler['writer'].writeNumber).toHaveBeenCalledWith(99);
  });

  it('should peek the next number', async () => {
    runsHandler['reader'].peakNext = jest.fn().mockResolvedValueOnce(77);
    runsHandler.isEOR = jest
      .fn()
      .mockReturnValueOnce(Promise.resolve(false))
      .mockReturnValueOnce(Promise.resolve(true));
    const nextNumber1 = await runsHandler.peakNext();
    const nextNumber2 = await runsHandler.peakNext();
    expect(nextNumber1).toBe(77);
    expect(nextNumber2).toBeNull();
  });

  it('should check if EOR is reached', async () => {
    (runsHandler['reader'].hasNumbers as jest.Mock).mockReturnValueOnce(false);
    (runsHandler['reader'].lineCount as number) = 1;
    (runsHandler['reader'].peakNext as jest.Mock).mockResolvedValueOnce(5);
    const eor = await runsHandler.isEOR();
    expect(eor).toBe(true);
  });

  it('should reset the handler', async () => {
    await runsHandler.reset();
    expect(runsHandler['writer'].reset).toHaveBeenCalled();
    expect(runsHandler['reader'].reset).toHaveBeenCalled();
  });

  it('should update the run number', () => {
    (runsHandler['reader'].lineCount as number) = 42;
    runsHandler.updateRunNumber();
    expect(runsHandler['runNumber']).toBe(42);
  });

  it('should reset file contents', async () => {
    await runsHandler.resetFileContents();
    expect(runsHandler['writer'].resetFileContents).toHaveBeenCalled();
  });

  it('should get the reader', () => {
    const reader = runsHandler.getReader();
    expect(reader).toBeInstanceOf(Reader);
  });

  it('should get the writer', () => {
    const writer = runsHandler.getWriter();
    expect(writer).toBeInstanceOf(Writer);
  });

  it('should get the file path', () => {
    const filePath = runsHandler.getFilePath();
    expect(filePath).toBe('test-file.txt');
  });
});

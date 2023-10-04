import Writer from '../src/Writer';

// Mock the fs module
jest.mock('fs', () => ({
  createWriteStream: jest.fn(() => ({
    write: jest.fn(),
    end: jest.fn(),
    emit: jest.fn(),
    once: jest.fn(),
  })),
  writeFile: jest.fn((path, data, callback) => callback(null)),
}));

describe('Writer', () => {
  let writer: Writer;
  const testFilePath = 'test-file.txt';

  beforeEach(() => {
    writer = new Writer(testFilePath);
  });

  it('should write data to the file', async () => {
    const writeMock = jest
      .spyOn(writer['writeStream'], 'write')
      .mockImplementation((data, encoding, callback) => {
        callback && callback(null); // Simulate successful write
        return true;
      });

    await writer.write('Hello, World!\n');
    expect(writeMock).toHaveBeenCalledWith('Hello, World!\n');
  });

  it('should write numbers to the file', async () => {
    const writeMock = jest
      .spyOn(writer['writeStream'], 'write')
      .mockImplementation((data, encoding, callback) => {
        callback && callback(null); // Simulate successful write
        return true;
      });

    await writer.writeNumber(42);
    expect(writeMock).toHaveBeenCalledWith('42 ');
  });

  it('should reset the file contents', async () => {
    const writeFileMock = jest
      .spyOn(writer, 'resetFileContents')
      .mockResolvedValue(undefined);

    await writer.resetFileContents();
    expect(writeFileMock).toHaveBeenCalledWith();
  });

  it('should reset the write stream', async () => {
    const endMock = jest.fn(() => Promise.resolve());
    writer.end = endMock;
    const previousWriteStream = writer['writeStream'];

    await writer.reset();

    expect(writer['writeStream']).not.toBe(previousWriteStream);
    expect(endMock).toBeCalled();
  });

  it('should end the write stream', async () => {
    const mockEnd = jest.fn();
    writer['writeStream'].end = mockEnd;

    writer.end();

    expect(mockEnd).toHaveBeenCalledTimes(1);
  });
});

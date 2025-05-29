/* global jest, describe, test, expect, beforeEach */
// getUserId.test.js

// Mock Firebase Admin SDK first
const mockGet = jest.fn();
const mockDoc = jest.fn();
const mockCollection = jest.fn();

const mockFirestore = {
  collection: mockCollection,
  doc: mockDoc,
};

// Mock firebase-admin
jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  firestore: jest.fn(() => mockFirestore),
}));

// Mock firebase-functions
jest.mock("firebase-functions/v2/https", () => ({
  onRequest: jest.fn((handler) => handler),
}));

jest.mock("firebase-functions/v2/options", () => ({
  setGlobalOptions: jest.fn(),
}));

jest.mock("firebase-functions/v2/firestore", () => ({
  onDocumentCreated: jest.fn(),
  onDocumentDeleted: jest.fn(),
}));

// Mock MQTT
jest.mock("mqtt", () => ({
  connect: jest.fn(() => ({
    on: jest.fn(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    publish: jest.fn(),
  })),
}));

const {getUserId} = require("../index");

describe("getUserId Cloud Function", () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Mock request object
    mockReq = {
      query: {},
    };

    // Mock response object
    mockRes = {
      set: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Reset mock functions
    mockCollection.mockClear();
    mockDoc.mockClear();
    mockGet.mockClear();
  });

  describe("Request Validation", () => {
    test("should return 400 error when deviceId is missing", async () => {
      mockReq.query = {};

      await getUserId(mockReq, mockRes);

      expect(mockRes.set).toHaveBeenCalledWith(
          "Access-Control-Allow-Origin", "*",
      );
      expect(mockRes.set).toHaveBeenCalledWith(
          "Access-Control-Allow-Methods", "GET",
      );
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Missing deviceId parameter",
      });
    });

    test("should return 400 error when deviceId is empty string", async () => {
      mockReq.query = {deviceId: ""};

      await getUserId(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Missing deviceId parameter",
      });
    });
  });

  describe("Successful Device Discovery", () => {
    test("should return userId and groupId when device is found", async () => {
      const deviceId = "test-device-123";
      const expectedUserId = "user-456";
      const expectedGroupId = "group-789";

      mockReq.query = {deviceId};

      // Mock users collection snapshot
      const mockUserDoc = {
        id: expectedUserId,
        data: jest.fn().mockReturnValue({}),
      };

      const mockUsersSnapshot = {
        docs: [mockUserDoc],
        size: 1,
      };

      // Mock device groups collection snapshot
      const mockGroupDoc = {
        id: expectedGroupId,
        data: jest.fn().mockReturnValue({}),
      };

      const mockGroupsSnapshot = {
        docs: [mockGroupDoc],
        size: 1,
      };

      // Mock device document
      const mockDeviceDoc = {
        exists: true,
        data: jest.fn().mockReturnValue({}),
      };

      const mockDeviceRef = {
        get: jest.fn().mockResolvedValue(mockDeviceDoc),
        path: `users/${expectedUserId}/deviceGroups/${expectedGroupId}/` +
              `devices/${deviceId}`,
      };

      const mockDeviceGroupsRef = {
        get: jest.fn().mockResolvedValue(mockGroupsSnapshot),
      };

      // Setup mock chain
      mockCollection
          .mockReturnValueOnce({
            get: jest.fn().mockResolvedValue(mockUsersSnapshot),
          }) // users collection
          .mockReturnValueOnce(mockDeviceGroupsRef); // deviceGroups collection

      mockDoc.mockReturnValue(mockDeviceRef);

      await getUserId(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        userId: expectedUserId,
        groupId: expectedGroupId,
      });
    });

    test("should check multiple users and groups until device is found",
        async () => {
          const deviceId = "test-device-123";
          const expectedUserId = "user-2";
          const expectedGroupId = "group-2";

          mockReq.query = {deviceId};

          // Mock multiple users
          const mockUserDocs = [
            {id: "user-1", data: jest.fn().mockReturnValue({})},
            {id: "user-2", data: jest.fn().mockReturnValue({})},
          ];

          const mockUsersSnapshot = {
            docs: mockUserDocs,
            size: 2,
          };

          // Mock multiple groups for each user
          const mockGroupsSnapshot1 = {
            docs: [{id: "group-1", data: jest.fn().mockReturnValue({})}],
            size: 1,
          };

          const mockGroupsSnapshot2 = {
            docs: [{id: "group-2", data: jest.fn().mockReturnValue({})}],
            size: 1,
          };

          // Mock device documents - first doesn't exist, second does
          const mockDeviceDoc1 = {exists: false};
          const mockDeviceDoc2 = {exists: true};

          const mockDeviceRef1 = {
            get: jest.fn().mockResolvedValue(mockDeviceDoc1),
            path: `users/user-1/deviceGroups/group-1/devices/${deviceId}`,
          };

          const mockDeviceRef2 = {
            get: jest.fn().mockResolvedValue(mockDeviceDoc2),
            path: `users/user-2/deviceGroups/group-2/devices/${deviceId}`,
          };

          // Setup mock chain
          mockCollection
              .mockReturnValueOnce({
                get: jest.fn().mockResolvedValue(mockUsersSnapshot),
              }) // users collection
              .mockReturnValueOnce({
                get: jest.fn().mockResolvedValue(mockGroupsSnapshot1),
              }) // user-1 deviceGroups
              .mockReturnValueOnce({
                get: jest.fn().mockResolvedValue(mockGroupsSnapshot2),
              }); // user-2 deviceGroups

          mockDoc
              .mockReturnValueOnce(mockDeviceRef1) // first device check
              .mockReturnValueOnce(mockDeviceRef2); // second device check

          await getUserId(mockReq, mockRes);

          expect(mockRes.status).toHaveBeenCalledWith(200);
          expect(mockRes.json).toHaveBeenCalledWith({
            userId: expectedUserId,
            groupId: expectedGroupId,
          });
        });
  });

  describe("Device Not Found", () => {
    test("should return 404 when device is not found in any group",
        async () => {
          const deviceId = "non-existent-device";
          mockReq.query = {deviceId};

          // Mock users collection snapshot
          const mockUserDoc = {
            id: "user-123",
            data: jest.fn().mockReturnValue({}),
          };

          const mockUsersSnapshot = {
            docs: [mockUserDoc],
            size: 1,
          };

          // Mock device groups collection snapshot
          const mockGroupDoc = {
            id: "group-456",
            data: jest.fn().mockReturnValue({}),
          };

          const mockGroupsSnapshot = {
            docs: [mockGroupDoc],
            size: 1,
          };

          // Mock device document that doesn't exist
          const mockDeviceDoc = {
            exists: false,
          };

          const mockDeviceRef = {
            get: jest.fn().mockResolvedValue(mockDeviceDoc),
            path: `users/user-123/deviceGroups/group-456/devices/${deviceId}`,
          };

          const mockDeviceGroupsRef = {
            get: jest.fn().mockResolvedValue(mockGroupsSnapshot),
          };

          // Setup mock chain
          mockCollection
              .mockReturnValueOnce({
                get: jest.fn().mockResolvedValue(mockUsersSnapshot),
              })
              .mockReturnValueOnce(mockDeviceGroupsRef);

          mockDoc.mockReturnValue(mockDeviceRef);

          await getUserId(mockReq, mockRes);

          expect(mockRes.status).toHaveBeenCalledWith(404);
          expect(mockRes.json).toHaveBeenCalledWith({
            error: "Device not found",
          });
        });

    test("should return 404 when no users exist", async () => {
      const deviceId = "test-device-123";
      mockReq.query = {deviceId};

      // Mock empty users collection
      const mockUsersSnapshot = {
        docs: [],
        size: 0,
      };

      mockCollection
          .mockReturnValueOnce({
            get: jest.fn().mockResolvedValue(mockUsersSnapshot),
          });

      await getUserId(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Device not found",
      });
    });
  });

  describe("Error Handling", () => {
    test("should return 500 error when Firestore throws an exception",
        async () => {
          const deviceId = "test-device-123";
          mockReq.query = {deviceId};

          const errorMessage = "Firestore connection failed";
          mockCollection.mockImplementation(() => {
            throw new Error(errorMessage);
          });

          await getUserId(mockReq, mockRes);

          expect(mockRes.status).toHaveBeenCalledWith(500);
          expect(mockRes.json).toHaveBeenCalledWith({
            error: "Internal server error",
          });
        });

    test("should return 500 error when database query fails", async () => {
      const deviceId = "test-device-123";
      mockReq.query = {deviceId};

      mockCollection.mockReturnValue({
        get: jest.fn().mockRejectedValue(new Error("Database query failed")),
      });

      await getUserId(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Internal server error",
      });
    });
  });

  describe("CORS Headers", () => {
    test("should always set CORS headers regardless of outcome", async () => {
      mockReq.query = {deviceId: "test"};

      // Mock a scenario that will result in 404
      mockCollection.mockReturnValue({
        get: jest.fn().mockResolvedValue({docs: [], size: 0}),
      });

      await getUserId(mockReq, mockRes);

      expect(mockRes.set).toHaveBeenCalledWith(
          "Access-Control-Allow-Origin", "*",
      );
      expect(mockRes.set).toHaveBeenCalledWith(
          "Access-Control-Allow-Methods", "GET",
      );
    });
  });
});

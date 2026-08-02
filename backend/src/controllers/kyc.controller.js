const kycModel = require("../models/kyc.model");

const MAX_DATA_URL_LENGTH = 1_400_000;
const DATA_URL_PATTERN = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=]+$/;

const isValidDocument = (value) => {
  return typeof value === "string" && value.length <= MAX_DATA_URL_LENGTH && DATA_URL_PATTERN.test(value);
};

const getMyKyc = async (req, res) => {
  const submission = await kycModel.getLatestByUserId(req.user.id);

  return res.status(200).json({
    success: true,
    data: submission
  });
};

const submitKyc = async (req, res) => {
  const { idFront, idBack, selfie } = req.body;

  if (!isValidDocument(idFront) || !isValidDocument(idBack) || !isValidDocument(selfie)) {
    return res.status(400).json({
      success: false,
      message: "Upload clear JPG, PNG, or WEBP images under 1MB each"
    });
  }

  const latest = await kycModel.getLatestByUserId(req.user.id);

  if (latest?.status === "pending") {
    return res.status(409).json({
      success: false,
      message: "Your KYC submission is already pending review"
    });
  }

  if (latest?.status === "approved") {
    return res.status(409).json({
      success: false,
      message: "Your KYC is already approved"
    });
  }

  const submission = await kycModel.createSubmission({
    user: req.user,
    idFront,
    idBack,
    selfie
  });

  return res.status(201).json({
    success: true,
    message: "KYC submitted successfully",
    data: submission
  });
};

const getAdminKyc = async (req, res) => {
  const submissions = await kycModel.getAll();

  return res.status(200).json({
    success: true,
    data: submissions
  });
};

const updateKycStatus = async (req, res) => {
  const status = req.body.status?.trim().toLowerCase();
  const note = req.body.note?.trim();

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status must be approved or rejected"
    });
  }

  const submission = await kycModel.updateStatus({
    id: req.params.id,
    status,
    note,
    reviewedBy: req.user.id
  });

  if (!submission) {
    return res.status(404).json({
      success: false,
      message: "KYC submission not found"
    });
  }

  return res.status(200).json({
    success: true,
    message: `KYC ${status}`,
    data: submission
  });
};

module.exports = {
  getMyKyc,
  submitKyc,
  getAdminKyc,
  updateKycStatus
};

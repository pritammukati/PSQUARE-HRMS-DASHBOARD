import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertCandidateSchema, insertEmployeeSchema, insertAttendanceSchema, insertLeaveSchema } from "@shared/schema";
import multer from "multer";
import path from "path";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const fileTypes = /pdf|doc|docx|jpg|jpeg|png/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only documents and images are allowed'));
    }
  },
});

function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

export function registerRoutes(app: Express): Server {
  // Setup authentication routes
  setupAuth(app);

  // Candidate routes
  app.get("/api/candidates", requireAuth, async (req, res) => {
    try {
      const candidates = await storage.getCandidates();
      res.json(candidates);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch candidates" });
    }
  });

  app.get("/api/candidates/:id", requireAuth, async (req, res) => {
    try {
      const candidate = await storage.getCandidate(parseInt(req.params.id));
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }
      res.json(candidate);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch candidate" });
    }
  });

  app.post("/api/candidates", requireAuth, upload.single('resume'), async (req, res) => {
    try {
      const candidateData = insertCandidateSchema.parse(req.body);
      
      if (req.file) {
        candidateData.resumeUrl = `/uploads/${req.file.filename}`;
      }

      const candidate = await storage.createCandidate(candidateData);
      res.status(201).json(candidate);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create candidate" });
    }
  });

  app.put("/api/candidates/:id", requireAuth, upload.single('resume'), async (req, res) => {
    try {
      const candidateData = req.body;
      
      if (req.file) {
        candidateData.resumeUrl = `/uploads/${req.file.filename}`;
      }

      const candidate = await storage.updateCandidate(parseInt(req.params.id), candidateData);
      res.json(candidate);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update candidate" });
    }
  });

  app.delete("/api/candidates/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteCandidate(parseInt(req.params.id));
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete candidate" });
    }
  });

  // Promote candidate to employee
  app.post("/api/candidates/:id/promote", requireAuth, async (req, res) => {
    try {
      const candidateId = parseInt(req.params.id);
      const candidate = await storage.getCandidate(candidateId);
      
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      const employeeData = insertEmployeeSchema.parse({
        fullName: candidate.fullName,
        email: candidate.email,
        phone: candidate.phone,
        position: candidate.position,
        department: req.body.department,
        dateOfJoining: new Date(),
        status: "present"
      });

      const employee = await storage.promoteCandidate(candidateId, employeeData);
      res.status(201).json(employee);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to promote candidate" });
    }
  });

  // Employee routes
  app.get("/api/employees", requireAuth, async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", requireAuth, async (req, res) => {
    try {
      const employee = await storage.getEmployee(parseInt(req.params.id));
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", requireAuth, async (req, res) => {
    try {
      const employeeData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(employeeData);
      res.status(201).json(employee);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create employee" });
    }
  });

  app.put("/api/employees/:id", requireAuth, async (req, res) => {
    try {
      const employee = await storage.updateEmployee(parseInt(req.params.id), req.body);
      res.json(employee);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteEmployee(parseInt(req.params.id));
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete employee" });
    }
  });

  // Attendance routes
  app.get("/api/attendance", requireAuth, async (req, res) => {
    try {
      const attendance = await storage.getAttendance();
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch attendance" });
    }
  });

  app.post("/api/attendance", requireAuth, async (req, res) => {
    try {
      const attendanceData = insertAttendanceSchema.parse(req.body);
      const attendance = await storage.createAttendance(attendanceData);
      res.status(201).json(attendance);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create attendance" });
    }
  });

  app.put("/api/attendance/:id", requireAuth, async (req, res) => {
    try {
      const attendance = await storage.updateAttendance(parseInt(req.params.id), req.body);
      res.json(attendance);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update attendance" });
    }
  });

  // Leave routes
  app.get("/api/leaves", requireAuth, async (req, res) => {
    try {
      const leaves = await storage.getLeaves();
      res.json(leaves);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaves" });
    }
  });

  app.get("/api/leaves/approved", requireAuth, async (req, res) => {
    try {
      const approvedLeaves = await storage.getApprovedLeaves();
      res.json(approvedLeaves);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch approved leaves" });
    }
  });

  app.post("/api/leaves", requireAuth, upload.single('documents'), async (req, res) => {
    try {
      const leaveData = insertLeaveSchema.parse({
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate || req.body.startDate),
      });

      if (req.file) {
        leaveData.documentsUrl = `/uploads/${req.file.filename}`;
      }

      const leave = await storage.createLeave(leaveData);
      res.status(201).json(leave);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to create leave" });
    }
  });

  app.put("/api/leaves/:id", requireAuth, async (req, res) => {
    try {
      const updateData = req.body;
      if (updateData.startDate) {
        updateData.startDate = new Date(updateData.startDate);
      }
      if (updateData.endDate) {
        updateData.endDate = new Date(updateData.endDate);
      }

      const leave = await storage.updateLeave(parseInt(req.params.id), updateData);
      res.json(leave);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Failed to update leave" });
    }
  });

  app.delete("/api/leaves/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteLeave(parseInt(req.params.id));
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete leave" });
    }
  });

  // Serve uploaded files
  app.use('/uploads', requireAuth, express.static('uploads'));

  // Serve attached assets
  app.use('/attached_assets', express.static('attached_assets'));

  const httpServer = createServer(app);
  return httpServer;
}

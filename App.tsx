/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { jsPDF } from "jspdf";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
import { motion, AnimatePresence } from "motion/react";
import { PrivacyPolicy } from "./components/PrivacyPolicy";
import { ContactUs } from "./components/ContactUs";
import { NovaBoardLogo } from "./components/NovaBoardLogo";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  serverTimestamp,
  getDocFromServer,
  deleteDoc,
} from "firebase/firestore";
import {
  Type,
  Trash2,
  Undo2,
  Redo2,
  Download,
  MousePointer,
  Square,
  Circle as CircleIcon,
  ArrowUpRight,
  Minus,
  Maximize,
  Grid,
  Palette,
  FileCode,
  Plus,
  X,
  Check,
  HelpCircle,
  Sparkles,
  Info,
  ChevronDown,
  Moon,
  Sun,
  Layout,
  Layers,
  StickyNote as StickyIcon,
  PenTool,
  Hand,
  Eraser,
  Box,
  Table,
  ChevronUp,
  Folder,
  Wand2,
  Globe,
  Camera,
  LayoutGrid,
  Ruler,
  RotateCw,
  ArrowLeftRight,
  EyeOff,
  XCircle,
  ChevronRight,
  Phone,
  Zap,
  Share2,
  Settings,
  Search,
  Calendar,
  UserCheck,
  Home,
  ArrowLeft,
} from "lucide-react";

interface Point {
  x: number;
  y: number;
}

interface DrawElement {
  id: string;
  type: string;
  points?: Point[];
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  color: string;
  width: number;
  text?: string;
}

interface StickyNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: "yellow" | "blue" | "green" | "pink" | "purple";
  width: number;
  height: number;
}

interface GeoTool {
  id: string;
  type: "ruler" | "protractor" | "compass" | "setsquare";
  x: number;
  y: number;
  rotation: number;
  width?: number;
  radius?: number;
}

interface BoardPage {
  id: string;
  name: string;
  elements: DrawElement[];
  stickyNotes: StickyNote[];
  geoTools: GeoTool[];
}

export default function App() {
  const [view, setView] = useState<"landing" | "whiteboard" | "privacy" | "contact">("landing");
  const [activeSubject, setActiveSubject] = useState<
    "math" | "physics" | "chemistry" | "english" | "arts"
  >("math");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [activeTool, setActiveTool] = useState<string>("pen");
  const [brushColor, setBrushColor] = useState<string>("#4f46e5"); // Indigo
  const [brushWidth, setBrushWidth] = useState<number>(4);
  const [gridType, setGridType] = useState<"none" | "dots" | "grid" | "lines">(
    "dots",
  );
  const [gridSize, setGridSize] = useState<number>(24);
  const [zoom, setZoom] = useState<number>(100);
  const [showBloggerModal, setShowBloggerModal] = useState<boolean>(false);
  const [copiedBlogger, setCopiedBlogger] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [boardTitle, setBoardTitle] = useState<string>("");
  const [pages, setPages] = useState<BoardPage[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string>("page-1");
  const [showMeasurements, setShowMeasurements] = useState<boolean>(true);
  const [geoTools, setGeoTools] = useState<GeoTool[]>([]);
  const [activeToolDrag, setActiveToolDrag] = useState<{
    id: string;
    action: "drag" | "rotate" | "resize";
    startX: number;
    startY: number;
    startRot?: number;
    startRotOffset?: number;
    startWidth?: number;
    startRadius?: number;
    startDist?: number;
  } | null>(null);

  // Sidebar drag & visibility states
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [showBottomBar, setShowBottomBar] = useState<boolean>(true);
  const [showTopBar, setShowTopBar] = useState<boolean>(true);
  const [showPenSettings, setShowPenSettings] = useState<boolean>(false);
  const [showEraserSettings, setShowEraserSettings] = useState<boolean>(false);
  const [eraserSize, setEraserSize] = useState<number>(30);
  const [eraserOpacity, setEraserOpacity] = useState<number>(100);

  // Dual Toolbar & Custom Shapes Panel States
  const [showShapesSubmenu, setShowShapesSubmenu] = useState<boolean>(false);
  const [openShapesPanel, setOpenShapesPanel] = useState<"2d" | "3d" | null>(
    null,
  );
  const [showFolderPopover, setShowFolderPopover] = useState<boolean>(false);
  const [showMagicPopover, setShowMagicPopover] = useState<boolean>(false);
  const [showAppsPopover, setShowAppsPopover] = useState<boolean>(false);
  const [showExportPopover, setShowExportPopover] = useState<boolean>(false);

  // Elements State for Canvas drawing
  const [elements, setElements] = useState<DrawElement[]>([]);
  const [history, setHistory] = useState<DrawElement[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Sticky Notes State
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);

  // UI States
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [panOffset, setPanOffset] = useState<Point>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPan, setStartPan] = useState<Point | null>(null);
  const [showBrowserHelper, setShowBrowserHelper] = useState<boolean>(false);
  const [currentTextId, setCurrentTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState<string>("");
  const [textInputPosition, setTextInputPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [draggedNote, setDraggedNote] = useState<{
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );
  const [draggedElement, setDraggedElement] = useState<{
    id: string;
    startX: number;
    startY: number;
  } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Firebase Auth & Data State
  const [user, setUser] = useState<User | null>(null);
  const [currentDbBoardId, setCurrentDbBoardId] = useState<string | null>(null);
  const [userBoards, setUserBoards] = useState<any[]>([]);
  const [boardSearch, setBoardSearch] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // Interactive landing page states
  const [mockupTab, setMockupTab] = useState<"draw" | "geo" | "notes" | "export">("draw");
  const [mockPenColor, setMockPenColor] = useState<string>("#4f46e5");
  const [mockNotes, setMockNotes] = useState([
    { id: 1, text: "قانون فيثاغورس:\na² + b² = c²", color: "yellow" as const },
    { id: 2, text: "واجب الرياضيات:\nحل تمارين صفحة ٤٥", color: "blue" as const },
    { id: 3, text: "تذكير حصة الغد:\nشرح مجسمات الأبعاد", color: "green" as const },
  ]);
  const [rulerRotation, setRulerRotation] = useState<number>(15);
  const [protractorRotation, setProtractorRotation] = useState<number>(-25);
  const [showFirebaseGuide, setShowFirebaseGuide] = useState<boolean>(false);

  const loadUserBoardsList = async (uid: string) => {
    try {
      const q = query(collection(db, "boards"), where("ownerId", "==", uid));
      const querySnapshot = await getDocs(q);
      const boards: any[] = [];
      querySnapshot.forEach((docSnap) => {
        boards.push({ id: docSnap.id, ...docSnap.data() });
      });
      // Sort by updatedAt descending if possible
      boards.sort((a, b) => {
        const timeA = a.updatedAt?.seconds || 0;
        const timeB = b.updatedAt?.seconds || 0;
        return timeB - timeA;
      });
      setUserBoards(boards);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, "boards");
    }
  };

  const deleteBoard = async (boardId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent loading the board when clicking delete
    const confirmed = window.confirm(
      language === "ar"
        ? "هل أنت متأكد من رغبتك في حذف هذه السبورة نهائياً؟"
        : "Are you sure you want to delete this board permanently?"
    );
    if (!confirmed) return;
    try {
      await deleteDoc(doc(db, "boards", boardId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `boards/${boardId}`);
    }
  };

  const loadSpecificBoard = (boardData: any, boardId: string) => {
    setCurrentDbBoardId(boardId);
    setBoardTitle(boardData.title || "");
    if (boardData.data) {
      const parsed = JSON.parse(boardData.data);
      if (parsed.pages && parsed.pages.length > 0) {
        setPages(parsed.pages);
        setCurrentPageId(parsed.pages[0].id);
        setElements(parsed.pages[0].elements || []);
        setStickyNotes(parsed.pages[0].stickyNotes || []);
        setGeoTools(parsed.pages[0].geoTools || []);
      }
    }
    setView("whiteboard");
  };

  const createNewBoard = () => {
    setCurrentDbBoardId(null);
    setBoardTitle("");
    setPages([]); // This will trigger the default pages effect
    setElements([]);
    setStickyNotes([]);
    setGeoTools([]);
    setView("whiteboard");
  };

  useEffect(() => {
    let unsubscribeBoards: (() => void) | null = null;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const q = query(collection(db, "boards"), where("ownerId", "==", currentUser.uid));
        unsubscribeBoards = onSnapshot(q, (snapshot) => {
          const boards: any[] = [];
          snapshot.forEach((docSnap) => {
            boards.push({ id: docSnap.id, ...docSnap.data() });
          });
          // Sort by updatedAt descending
          boards.sort((a, b) => {
            const timeA = a.updatedAt?.seconds || 0;
            const timeB = b.updatedAt?.seconds || 0;
            return timeB - timeA;
          });
          setUserBoards(boards);
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, "boards");
        });
      } else {
        if (unsubscribeBoards) {
          unsubscribeBoards();
          unsubscribeBoards = null;
        }
        setUserBoards([]);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeBoards) {
        unsubscribeBoards();
      }
    };
  }, []);

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error && (error.code === "auth/popup-closed-by-user" || error.code === "auth/cancelled-popup-request")) {
        console.log("Sign-in popup was closed or cancelled by the user.");
      } else {
        console.error("Sign-in error:", error);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setPages([]);
    setElements([]);
    setStickyNotes([]);
    setGeoTools([]);
    setCurrentDbBoardId(null);
  };

  // Auto-save
  useEffect(() => {
    if (!user) return;
    const saveBoard = async () => {
      setIsSaving(true);
      try {
        const boardData = {
          ownerId: user.uid,
          title: boardTitle || "Untitled Board",
          data: JSON.stringify({ pages }),
          updatedAt: serverTimestamp(),
        };

        if (currentDbBoardId) {
          await updateDoc(doc(db, "boards", currentDbBoardId), boardData);
        } else {
          // ensure we have a valid board creation timestamp
          const newDocRef = doc(collection(db, "boards"));
          await setDoc(newDocRef, {
            ...boardData,
            createdAt: serverTimestamp(),
          });
          setCurrentDbBoardId(newDocRef.id);
        }
      } catch (err) {
        handleFirestoreError(err, currentDbBoardId ? OperationType.UPDATE : OperationType.CREATE, `boards/${currentDbBoardId || 'new'}`);
      }
      setTimeout(() => setIsSaving(false), 800);
    };

    const timeout = setTimeout(saveBoard, 2000);
    return () => clearTimeout(timeout);
  }, [pages, boardTitle, user]);

  // Initialize default pages state
  useEffect(() => {
    if (pages.length === 0) {
      setPages([
        {
          id: "page-1",
          name: language === "ar" ? "الصفحة الأولى" : "Page 1",
          elements: elements,
          stickyNotes: stickyNotes,
          geoTools: geoTools,
        },
      ]);
    }
  }, []);

  // Keep active page elements, notes, and tools in sync with the pages array
  useEffect(() => {
    setPages((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((page) => {
        if (page.id === currentPageId) {
          return {
            ...page,
            elements,
            stickyNotes,
            geoTools,
          };
        }
        return page;
      });
    });
  }, [elements, stickyNotes, geoTools, currentPageId]);

  const switchPage = (targetPageId: string) => {
    const targetPage = pages.find((p) => p.id === targetPageId);
    if (!targetPage) return;

    // Set active ID
    setCurrentPageId(targetPageId);

    // Update whiteboard state variables
    setElements(targetPage.elements || []);
    setStickyNotes(targetPage.stickyNotes || []);
    setGeoTools(targetPage.geoTools || []);

    // Sync history step for the active page
    setHistory([targetPage.elements || []]);
    setHistoryIndex(0);
  };

  const addNewPage = () => {
    const newPageId = `page-${Date.now()}`;
    const newPageNum = pages.length + 1;
    const newPageName =
      language === "ar" ? `الصفحة ${newPageNum}` : `Page ${newPageNum}`;

    const newPage: BoardPage = {
      id: newPageId,
      name: newPageName,
      elements: [],
      stickyNotes: [],
      geoTools: [],
    };

    setPages((prev) => [...prev, newPage]);
    setCurrentPageId(newPageId);
    setElements([]);
    setStickyNotes([]);
    setGeoTools([]);
    setHistory([[]]);
    setHistoryIndex(0);
  };

  const deletePage = (pageId: string) => {
    if (pages.length <= 1) return;

    const indexToDelete = pages.findIndex((p) => p.id === pageId);
    const newPages = pages.filter((p) => p.id !== pageId);
    setPages(newPages);

    if (currentPageId === pageId) {
      const nextActiveIndex = Math.max(0, indexToDelete - 1);
      const nextActivePage = newPages[nextActiveIndex];

      setCurrentPageId(nextActivePage.id);
      setElements(nextActivePage.elements || []);
      setStickyNotes(nextActivePage.stickyNotes || []);
      setGeoTools(nextActivePage.geoTools || []);
      setHistory([nextActivePage.elements || []]);
      setHistoryIndex(0);
    }
  };

  const exportAllPagesAsPDF = async () => {
    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [1200, 800],
      });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];

        // Create temporary canvas
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = 1200;
        tempCanvas.height = 800;
        const tempCtx = tempCanvas.getContext("2d");
        if (!tempCtx) continue;

        // 1. Draw solid background
        tempCtx.fillStyle = "#ffffff";
        tempCtx.fillRect(0, 0, 1200, 800);

        // 2. Draw Grid Pattern if gridType is dots or grid (simulate it or draw actual grid dots)
        if (gridType === "dots") {
          tempCtx.fillStyle = "#cbd5e1";
          for (let x = 0; x < 1200; x += gridSize) {
            for (let y = 0; y < 800; y += gridSize) {
              tempCtx.beginPath();
              tempCtx.arc(x, y, 1.2, 0, 2 * Math.PI);
              tempCtx.fill();
            }
          }
        } else if (gridType === "grid") {
          tempCtx.strokeStyle = "#f1f5f9";
          tempCtx.lineWidth = 1;
          tempCtx.beginPath();
          for (let x = 0; x < 1200; x += gridSize) {
            tempCtx.moveTo(x, 0);
            tempCtx.lineTo(x, 800);
          }
          for (let y = 0; y < 800; y += gridSize) {
            tempCtx.moveTo(0, y);
            tempCtx.lineTo(1200, y);
          }
          tempCtx.stroke();
        }

        // 3. Draw elements belonging to this page
        tempCtx.save();
        page.elements.forEach((el) => {
          tempCtx.beginPath();
          tempCtx.strokeStyle = el.color;
          tempCtx.lineWidth = el.width;
          tempCtx.lineCap = "round";
          tempCtx.lineJoin = "round";

          if ((el.type === "pen" || el.type === "ai-pen") && el.points && el.points.length > 0) {
            tempCtx.moveTo(el.points[0].x, el.points[0].y);
            for (let pIdx = 1; pIdx < el.points.length; pIdx++) {
              tempCtx.lineTo(el.points[pIdx].x, el.points[pIdx].y);
            }
            tempCtx.stroke();
          } else if (
            el.type === "eraser" &&
            el.points &&
            el.points.length > 0
          ) {
            tempCtx.strokeStyle = el.color || "#ffffff";
            tempCtx.moveTo(el.points[0].x, el.points[0].y);
            for (let pIdx = 1; pIdx < el.points.length; pIdx++) {
              tempCtx.lineTo(el.points[pIdx].x, el.points[pIdx].y);
            }
            tempCtx.stroke();
          } else if (
            el.type === "text" &&
            el.x1 !== undefined &&
            el.y1 !== undefined &&
            el.text
          ) {
            tempCtx.fillStyle = el.color;
            tempCtx.font = `bold ${el.width * 4}px sans-serif`;
            tempCtx.fillText(el.text, el.x1, el.y1);
          } else if (
            el.x1 !== undefined &&
            el.y1 !== undefined &&
            el.x2 !== undefined &&
            el.y2 !== undefined
          ) {
            const x1 = el.x1;
            const y1 = el.y1;
            const x2 = el.x2;
            const y2 = el.y2;
            const w = x2 - x1;
            const h = y2 - y1;
            const cx = (x1 + x2) / 2;
            const cy = (y1 + y2) / 2;
            const r = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

            if (el.type === "rect") {
              tempCtx.strokeRect(x1, y1, w, h);
            } else if (el.type === "circle") {
              tempCtx.arc(x1, y1, r, 0, 2 * Math.PI);
              tempCtx.stroke();
            } else if (el.type === "line") {
              tempCtx.moveTo(x1, y1);
              tempCtx.lineTo(x2, y2);
              tempCtx.stroke();
            } else if (el.type === "arrow") {
              tempCtx.moveTo(x1, y1);
              tempCtx.lineTo(x2, y2);
              tempCtx.stroke();
              const angle = Math.atan2(y2 - y1, x2 - x1);
              tempCtx.beginPath();
              tempCtx.moveTo(x2, y2);
              tempCtx.lineTo(
                x2 - 12 * Math.cos(angle - Math.PI / 6),
                y2 - 12 * Math.sin(angle - Math.PI / 6),
              );
              tempCtx.lineTo(
                x2 - 12 * Math.cos(angle + Math.PI / 6),
                y2 - 12 * Math.sin(angle + Math.PI / 6),
              );
              tempCtx.closePath();
              tempCtx.fillStyle = el.color;
              tempCtx.fill();
            } else if (el.type === "right_triangle") {
              tempCtx.moveTo(x1, y1);
              tempCtx.lineTo(x1, y2);
              tempCtx.lineTo(x2, y2);
              tempCtx.closePath();
              tempCtx.stroke();
            } else if (el.type === "triangle") {
              tempCtx.moveTo(cx, y1);
              tempCtx.lineTo(x1, y2);
              tempCtx.lineTo(x2, y2);
              tempCtx.closePath();
              tempCtx.stroke();
            } else if (el.type === "cylinder") {
              const rx = Math.abs(w) / 2;
              const ry = Math.min(20, Math.abs(h) * 0.15);
              tempCtx.ellipse(cx, y1 + ry, rx, ry, 0, 0, 2 * Math.PI);
              tempCtx.stroke();
              tempCtx.beginPath();
              tempCtx.ellipse(cx, y2 - ry, rx, ry, 0, 0, 2 * Math.PI);
              tempCtx.stroke();
              tempCtx.beginPath();
              tempCtx.moveTo(x1, y1 + ry);
              tempCtx.lineTo(x1, y2 - ry);
              tempCtx.moveTo(x2, y1 + ry);
              tempCtx.lineTo(x2, y2 - ry);
              tempCtx.stroke();
            } else if (el.type === "cone") {
              const rx = Math.abs(w) / 2;
              const ry = Math.min(20, Math.abs(h) * 0.15);
              tempCtx.ellipse(cx, y2 - ry, rx, ry, 0, 0, 2 * Math.PI);
              tempCtx.stroke();
              tempCtx.beginPath();
              tempCtx.moveTo(cx, y1);
              tempCtx.lineTo(x1, y2 - ry);
              tempCtx.moveTo(cx, y1);
              tempCtx.lineTo(x2, y2 - ry);
              tempCtx.stroke();
            } else if (el.type === "star") {
              const spikes = 5;
              const outerRadius = Math.abs(w) / 2;
              const innerRadius = outerRadius * 0.5;
              let rot = (Math.PI / 2) * 3;
              let sx = cx;
              let sy = cy;
              const step = Math.PI / spikes;
              tempCtx.moveTo(cx, cy - outerRadius);
              for (let sIdx = 0; sIdx < spikes; sIdx++) {
                sx = cx + Math.cos(rot) * outerRadius;
                sy = cy + Math.sin(rot) * outerRadius;
                tempCtx.lineTo(sx, sy);
                rot += step;
                sx = cx + Math.cos(rot) * innerRadius;
                sy = cy + Math.sin(rot) * innerRadius;
                tempCtx.lineTo(sx, sy);
                rot += step;
              }
              tempCtx.closePath();
              tempCtx.stroke();
            } else if (el.type === "rhombus") {
              tempCtx.moveTo(cx, y1);
              tempCtx.lineTo(x2, cy);
              tempCtx.lineTo(cx, y2);
              tempCtx.lineTo(x1, cy);
              tempCtx.closePath();
              tempCtx.stroke();
            } else if (el.type === "ellipse") {
              tempCtx.ellipse(
                cx,
                cy,
                Math.abs(w) / 2,
                Math.abs(h) / 2,
                0,
                0,
                2 * Math.PI,
              );
              tempCtx.stroke();
            } else if (el.type === "cube") {
              const shift = Math.min(w, h) * 0.3;
              tempCtx.strokeRect(x1, y1 + shift, w - shift, h - shift);
              tempCtx.strokeRect(x1 + shift, y1, w - shift, h - shift);
              tempCtx.beginPath();
              tempCtx.moveTo(x1, y1 + shift);
              tempCtx.lineTo(x1 + shift, y1);
              tempCtx.moveTo(x2 - shift, y1 + shift);
              tempCtx.lineTo(x2, y1);
              tempCtx.moveTo(x2 - shift, y2);
              tempCtx.lineTo(x2, y2 - shift);
              tempCtx.moveTo(x1, y2);
              tempCtx.lineTo(x1 + shift, y2 - shift);
              tempCtx.stroke();
            } else if (el.type === "sphere") {
              const radius = Math.min(Math.abs(w), Math.abs(h)) / 2;
              tempCtx.arc(cx, cy, radius, 0, 2 * Math.PI);
              tempCtx.stroke();
              tempCtx.beginPath();
              tempCtx.ellipse(cx, cy, radius, radius * 0.25, 0, 0, 2 * Math.PI);
              tempCtx.stroke();
              tempCtx.beginPath();
              tempCtx.ellipse(cx, cy, radius * 0.25, radius, 0, 0, 2 * Math.PI);
              tempCtx.stroke();
            } else if (el.type === "parallelogram") {
              const shift = w * 0.25;
              tempCtx.moveTo(x1 + shift, y1);
              tempCtx.lineTo(x2, y1);
              tempCtx.lineTo(x2 - shift, y2);
              tempCtx.lineTo(x1, y2);
              tempCtx.closePath();
              tempCtx.stroke();
            } else if (el.type === "trapezoid") {
              const shift = w * 0.2;
              tempCtx.moveTo(x1 + shift, y1);
              tempCtx.lineTo(x2 - shift, y1);
              tempCtx.lineTo(x2, y2);
              tempCtx.lineTo(x1, y2);
              tempCtx.closePath();
              tempCtx.stroke();
            }
          }
        });

        // 4. Draw sticky notes on the temp canvas
        page.stickyNotes.forEach((note) => {
          const noteColors: Record<
            string,
            { bg: string; text: string; border: string }
          > = {
            yellow: { bg: "#fef08a", text: "#854d0e", border: "#fde047" },
            blue: { bg: "#bfdbfe", text: "#1e40af", border: "#93c5fd" },
            green: { bg: "#bbf7d0", text: "#166534", border: "#86efac" },
            pink: { bg: "#fbcfe8", text: "#9d174d", border: "#f9a8d4" },
            purple: { bg: "#e9d5ff", text: "#6b21a8", border: "#d8b4fe" },
          };
          const colors = noteColors[note.color] || noteColors.yellow;

          tempCtx.fillStyle = colors.bg;
          tempCtx.strokeStyle = colors.border;
          tempCtx.lineWidth = 1;

          tempCtx.beginPath();
          if (tempCtx.roundRect) {
            tempCtx.roundRect(note.x, note.y, note.width, note.height, 12);
          } else {
            tempCtx.rect(note.x, note.y, note.width, note.height);
          }
          tempCtx.fill();
          tempCtx.stroke();

          tempCtx.fillStyle = colors.text;
          tempCtx.font = "bold 12px sans-serif";
          const lines = note.text.split("\n");
          let textY = note.y + 20;
          lines.forEach((l) => {
            if (textY < note.y + note.height - 10) {
              tempCtx.fillText(l, note.x + 15, textY, note.width - 30);
              textY += 16;
            }
          });
        });

        tempCtx.restore();

        // 5. Render Page Index or Header
        tempCtx.fillStyle = "#0f172a";
        tempCtx.font = "bold 11px sans-serif";
        tempCtx.fillText(page.name, 24, 765);

        tempCtx.fillStyle = "#94a3b8";
        tempCtx.font = "bold 10px monospace";
        tempCtx.fillText(`NovaBoard • Mr. Mohamed El-Gazzar`, 1000, 765);

        const imgData = tempCanvas.toDataURL("image/png");

        if (i > 0) {
          pdf.addPage([1200, 800], "landscape");
        }
        pdf.addImage(imgData, "PNG", 0, 0, 1200, 800);
      }

      pdf.save(
        `${boardTitle.trim().replace(/\s+/g, "_") || (language === "ar" ? "سبورة_نوفا" : "novaboard_lesson")}.pdf`,
      );
    } catch (error) {
      console.error("Error exporting PDF:", error);
    }
  };

  // Add standard color presets matching Geometric Balance
  const colorPresets = [
    { value: "#4f46e5", label: "Indigo" },
    { value: "#0f172a", label: "Slate" },
    { value: "#f43f5e", label: "Rose" },
    { value: "#10b981", label: "Emerald" },
    { value: "#f59e0b", label: "Amber" },
    { value: "#8b5cf6", label: "Violet" },
  ];

  // Translations
  const t = {
    title: language === "ar" ? "نوفا بورد" : "NovaBoard",
    whiteboard:
      language === "ar"
        ? "سبورة تفاعلية حديثة"
        : "Modern SaaS Interactive Whiteboard",
    saved: language === "ar" ? "تم الحفظ تلقائياً" : "Auto Saved",
    share: language === "ar" ? "تصدير الدرس" : "Export Lesson",
    downloadPng: language === "ar" ? "حفظ كصورة PNG" : "Save as PNG Image",
    exportBlogger:
      language === "ar" ? "تضمين في بلوجر (Blogger)" : "Blogger Embed Code",
    bloggerDesc:
      language === "ar"
        ? "احصل على الكود الكامل للسبورة جاهزاً للنسخ واللصق داخل مدونة Blogger الخاصة بك لتعمل بكامل كفاءتها وتفاعليتها!"
        : "Get the fully featured self-contained code to paste directly into your Blogger posts. Highly interactive and styled!",
    copyCode: language === "ar" ? "نسخ كود التضمين" : "Copy Embed Code",
    copied: language === "ar" ? "تم النسخ بنجاح!" : "Copied successfully!",
    close: language === "ar" ? "إغلاق" : "Close",
    grid: language === "ar" ? "الشبكة" : "Grid",
    gridNone: language === "ar" ? "بدون شبكة" : "No Grid",
    gridDots: language === "ar" ? "نقاط هندسية" : "Dot Grid",
    gridMesh: language === "ar" ? "مربعات كاملة" : "Mesh Grid",
    addNote: language === "ar" ? "إضافة بطاقة لاصقة" : "Sticky Note",
    clearAll: language === "ar" ? "مسح الكل" : "Clear Board",
    undo: language === "ar" ? "تراجع" : "Undo",
    redo: language === "ar" ? "إعادة" : "Redo",
    color: language === "ar" ? "اللون" : "Color",
    thickness: language === "ar" ? "السمك" : "Thickness",
    thin: language === "ar" ? "رقيق" : "Thin",
    medium: language === "ar" ? "متوسط" : "Medium",
    thick: language === "ar" ? "سميك" : "Thick",
    help: language === "ar" ? "كيفية الاستخدام" : "User Guide",
    helpDesc:
      language === "ar"
        ? "استخدم شريط الأدوات الأيسر للرسم وإضافة الأشكال والنصوص والبطاقات اللاصقة. يمكنك سحبها وترتيبها بسهولة لتوفير درس ممتع وبصري رائع للطلاب."
        : "Use the left floating toolbar to draw, add shapes, texts, or sticky notes. Drag elements to organize your educational board.",
    doubleClickEdit:
      language === "ar"
        ? "انقر مرتين لتعديل البطاقة"
        : "Double click note to edit content",
    placeholderNote:
      language === "ar" ? "اكتب ملاحظتك هنا..." : "Write your note here...",
    selectTool: language === "ar" ? "تحديد وتحريك" : "Select & Drag",
    penTool: language === "ar" ? "قلم الرسم الحر" : "Freehand Pen",
    eraserTool: language === "ar" ? "ممحاة النقاط" : "Eraser",
    rectTool: language === "ar" ? "رسم مستطيل" : "Rectangle",
    circleTool: language === "ar" ? "رسم دائرة" : "Circle",
    lineTool: language === "ar" ? "رسم خط مستقيم" : "Straight Line",
    arrowTool: language === "ar" ? "رسم سهم توجيهي" : "Arrow Point",
    textTool: language === "ar" ? "إضافة نص" : "Add Text",
    deleteNote: language === "ar" ? "حذف البطاقة" : "Delete note",
    bloggerAlert:
      language === "ar"
        ? "كود Blogger جاهز! تم تصميمه بـ Vanilla JS بالكامل ليتوافق تماماً مع أي قالب Blogger دون إبطاء الموقع."
        : "Blogger code ready! Programmed with lightweight Vanilla JS to run inside any Blogger template cleanly.",

    // Landing Page Specific translations
    heroTitle:
      language === "ar"
        ? "الجيل الجديد من السبورات التفاعلية الفاخرة"
        : "The elegant whiteboard crafted for visionary educators",
    heroSubtitle:
      language === "ar"
        ? "منصة ذكية متكاملة، فائقة السرعة، ومصممة بجمال هندسي متقن. صُممت خصيصاً لتعمل بكفاءة مطلقة داخل مدونات Blogger وقوالبها بدون أي تأثير على سرعة التصفح."
        : "A beautiful, self-contained interactive board. Built with geometric balance to embed seamlessly into any Blogger template without compromising page speed.",
    launchBtn:
      language === "ar" ? "ابدأ تشغيل السبورة التفاعلية" : "Launch Whiteboard",
    tryWhiteboard:
      language === "ar" ? "جرب السبورة الآن مجاناً" : "Try Free Version",
    learnMore: language === "ar" ? "اكتشف المميزات" : "Explore Features",
    featuresTitle:
      language === "ar"
        ? "أدوات مذهلة، صُممت بإتقان فائق"
        : "Powerful tools, built with absolute precision",
    featuresSubtitle:
      language === "ar"
        ? "كل ما تحتاجه لتقديم شروحات آسرة وتبسيط المفاهيم الصعبة لطلابك."
        : "Everything you need to deliver engaging lectures and simplify complex structures.",
    subjectsTitle:
      language === "ar"
        ? "ندعم جميع التخصصات والمواد الدراسية"
        : "Tailored beautifully for every curriculum",
    subjectsSubtitle:
      language === "ar"
        ? "سواء كنت تشرح معادلات رياضية معقدة أو تركيباً كيميائياً، نوفا بورد تمنحك الأناقة الكاملة."
        : "Whether teaching advanced calculus or organic chemistry, NovaBoard is your creative companion.",
    benefitsTitle:
      language === "ar"
        ? "لماذا يفضل المعلمون سبورة NovaBoard؟"
        : "Why do leading educators choose NovaBoard?",
    statsTitle:
      language === "ar"
        ? "أرقام تتحدث عن الكفاءة والسرعة الفائقة"
        : "Performance and scalability metrics",
    ctaTitle:
      language === "ar"
        ? "هل أنت مستعد لتغيير أسلوب شرحك للأبد؟"
        : "Ready to elevate your teaching experience?",
    ctaSubtitle:
      language === "ar"
        ? "انضم إلى آلاف المعلمين المتميزين الذين يثقون في نوفا بورد لتقديم شروحات ذكية وبصرية متكاملة."
        : "Join thousands of visionary educators delivering unforgettable interactive sessions on their blogs.",
    footerDesc:
      language === "ar"
        ? "سبورة تفاعلية ذكية مصممة بأحدث تقنيات الويب لمساعدة المعلمين في تقديم دروس رائعة وسهلة النشر."
        : "Smart interactive whiteboard designed with modern web technologies to help teachers deliver high-quality, publishable lessons.",
    allRightsReserved:
      language === "ar" ? "جميع الحقوق محفوظة" : "All rights reserved",
  };

  // Set up canvas sizes and handle resize using ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas && container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        redrawCanvas();
      }
    };

    // Set up ResizeObserver for perfect element tracking
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(container);

    // Trigger initial resizing
    handleResize();
    const timer1 = setTimeout(handleResize, 50);
    const timer2 = setTimeout(handleResize, 150);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [view]);

  // Redraw Canvas
  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawMeasurement = (
      c: CanvasRenderingContext2D,
      text: string,
      x: number,
      y: number,
      angle = 0,
    ) => {
      c.save();
      c.translate(x, y);
      c.rotate(angle);
      c.font = "bold 10px sans-serif";

      const metrics = c.measureText(text);
      const textWidth = metrics.width;
      const paddingX = 5;
      const paddingY = 3;
      const bgWidth = textWidth + paddingX * 2;
      const bgHeight = 14;

      c.fillStyle = "#1e293b"; // slate-800
      c.beginPath();
      const rx = -bgWidth / 2;
      const ry = -bgHeight / 2;
      if (c.roundRect) {
        c.roundRect(rx, ry, bgWidth, bgHeight, 3);
      } else {
        c.rect(rx, ry, bgWidth, bgHeight);
      }
      c.fill();

      c.fillStyle = "#ffffff";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(text, 0, 0);
      c.restore();
    };

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Translate the canvas content by the active panning offset
    ctx.translate(panOffset.x, panOffset.y);

    // Render all elements
    elements.forEach((el) => {
      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.lineWidth = el.width * (zoom / 100);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if ((el.type === "pen" || el.type === "ai-pen") && el.points && el.points.length > 0) {
        ctx.moveTo(
          el.points[0].x * (zoom / 100),
          el.points[0].y * (zoom / 100),
        );
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(
            el.points[i].x * (zoom / 100),
            el.points[i].y * (zoom / 100),
          );
        }
        ctx.stroke();

        // If it's an AI Pen stroke, draw an elegant, magical neon-violet halo
        if (el.type === "ai-pen") {
          ctx.save();
          ctx.strokeStyle = "rgba(168, 85, 247, 0.35)"; // soft violet glow
          ctx.lineWidth = (el.width + 6) * (zoom / 100);
          ctx.stroke();
          ctx.restore();
        }
      } else if (el.type === "eraser" && el.points && el.points.length > 0) {
        // Use destination-out to erase pixels and reveal the background grid
        ctx.globalCompositeOperation = "destination-out";
        ctx.strokeStyle = el.color || "rgba(0,0,0,1)";
        ctx.moveTo(
          el.points[0].x * (zoom / 100),
          el.points[0].y * (zoom / 100),
        );
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(
            el.points[i].x * (zoom / 100),
            el.points[i].y * (zoom / 100),
          );
        }
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
      } else if (
        el.type === "text" &&
        el.x1 !== undefined &&
        el.y1 !== undefined &&
        el.text
      ) {
        ctx.fillStyle = el.color;
        ctx.font = `bold ${el.width * 4 * (zoom / 100)}px sans-serif`;
        ctx.fillText(el.text, el.x1 * (zoom / 100), el.y1 * (zoom / 100));
      } else if (
        el.x1 !== undefined &&
        el.y1 !== undefined &&
        el.x2 !== undefined &&
        el.y2 !== undefined
      ) {
        const x1 = el.x1 * (zoom / 100);
        const y1 = el.y1 * (zoom / 100);
        const x2 = el.x2 * (zoom / 100);
        const y2 = el.y2 * (zoom / 100);
        const w = x2 - x1;
        const h = y2 - y1;
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const r = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

        if (el.type === "rect") {
          ctx.strokeRect(x1, y1, w, h);
        } else if (el.type === "circle") {
          ctx.arc(x1, y1, r, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (el.type === "line") {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        } else if (el.type === "arrow") {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const headlen = 15 * (zoom / 100);
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(
            x2 - headlen * Math.cos(angle - Math.PI / 6),
            y2 - headlen * Math.sin(angle - Math.PI / 6),
          );
          ctx.moveTo(x2, y2);
          ctx.lineTo(
            x2 - headlen * Math.cos(angle + Math.PI / 6),
            y2 - headlen * Math.sin(angle + Math.PI / 6),
          );
          ctx.stroke();
        } else if (el.type === "triangle") {
          ctx.moveTo(cx, y1);
          ctx.lineTo(x1, y2);
          ctx.lineTo(x2, y2);
          ctx.closePath();
          ctx.stroke();
        } else if (el.type === "right_triangle") {
          ctx.moveTo(x1, y1);
          ctx.lineTo(x1, y2);
          ctx.lineTo(x2, y2);
          ctx.closePath();
          ctx.stroke();
        } else if (el.type === "star") {
          const rOut = Math.min(Math.abs(w), Math.abs(h)) / 2;
          const rIn = rOut * 0.4;
          for (let i = 0; i < 10; i++) {
            const angle = (i * Math.PI) / 5 - Math.PI / 2;
            const currR = i % 2 === 0 ? rOut : rIn;
            const px = cx + currR * Math.cos(angle);
            const py = cy + currR * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        } else if (el.type === "pentagon") {
          const radius = Math.min(Math.abs(w), Math.abs(h)) / 2;
          for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
            const px = cx + radius * Math.cos(angle);
            const py = cy + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        } else if (el.type === "hexagon") {
          const radius = Math.min(Math.abs(w), Math.abs(h)) / 2;
          for (let i = 0; i < 6; i++) {
            const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2;
            const px = cx + radius * Math.cos(angle);
            const py = cy + radius * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();
        } else if (el.type === "ellipse") {
          ctx.ellipse(
            cx,
            cy,
            Math.abs(w) / 2,
            Math.abs(h) / 2,
            0,
            0,
            2 * Math.PI,
          );
          ctx.stroke();
        } else if (el.type === "rhombus") {
          ctx.moveTo(cx, y1);
          ctx.lineTo(x2, cy);
          ctx.lineTo(cx, y2);
          ctx.lineTo(x1, cy);
          ctx.closePath();
          ctx.stroke();
        } else if (el.type === "parallelogram") {
          const shift = w * 0.25;
          ctx.moveTo(x1 + shift, y1);
          ctx.lineTo(x2, y1);
          ctx.lineTo(x2 - shift, y2);
          ctx.lineTo(x1, y2);
          ctx.closePath();
          ctx.stroke();
        } else if (el.type === "trapezoid") {
          const shift = w * 0.2;
          ctx.moveTo(x1 + shift, y1);
          ctx.lineTo(x2 - shift, y1);
          ctx.lineTo(x2, y2);
          ctx.lineTo(x1, y2);
          ctx.closePath();
          ctx.stroke();
        } else if (el.type === "heart") {
          ctx.moveTo(cx, y1 + h * 0.2);
          ctx.bezierCurveTo(cx, y1, x1, y1, x1, cy);
          ctx.bezierCurveTo(x1, y2 - h * 0.3, cx, y2, cx, y2);
          ctx.bezierCurveTo(cx, y2, x2, y2 - h * 0.3, x2, cy);
          ctx.bezierCurveTo(x2, y1, cx, y1, cx, y1 + h * 0.2);
          ctx.stroke();
        } else if (el.type === "crescent") {
          ctx.ellipse(
            cx - w * 0.1,
            cy,
            Math.abs(w) / 2,
            Math.abs(h) / 2,
            0,
            -Math.PI / 2,
            Math.PI / 2,
          );
          ctx.ellipse(
            cx + w * 0.05,
            cy,
            Math.abs(w) / 3,
            Math.abs(h) / 2,
            0,
            Math.PI / 2,
            -Math.PI / 2,
            true,
          );
          ctx.stroke();
        } else if (el.type === "cross") {
          const sw = Math.abs(w) / 3;
          const sh = Math.abs(h) / 3;
          ctx.moveTo(x1 + sw, y1);
          ctx.lineTo(x2 - sw, y1);
          ctx.lineTo(x2 - sw, y1 + sh);
          ctx.lineTo(x2, y1 + sh);
          ctx.lineTo(x2, y2 - sh);
          ctx.lineTo(x2 - sw, y2 - sh);
          ctx.lineTo(x2 - sw, y2);
          ctx.lineTo(x1 + sw, y2);
          ctx.lineTo(x1 + sw, y2 - sh);
          ctx.lineTo(x1, y2 - sh);
          ctx.lineTo(x1, y1 + sh);
          ctx.lineTo(x1 + sw, y1 + sh);
          ctx.closePath();
          ctx.stroke();
        } else if (el.type === "cube") {
          const dx = w * 0.25;
          const dy = h * 0.25;
          ctx.strokeRect(x1, y1 + dy, w - dx, h - dy);
          ctx.strokeRect(x1 + dx, y1, w - dx, h - dy);
          ctx.moveTo(x1, y1 + dy);
          ctx.lineTo(x1 + dx, y1);
          ctx.moveTo(x2 - dx, y1 + dy);
          ctx.lineTo(x2, y1);
          ctx.moveTo(x2 - dx, y2);
          ctx.lineTo(x2, y2 - dy);
          ctx.moveTo(x1, y2);
          ctx.lineTo(x1 + dx, y2 - dy);
          ctx.stroke();
        } else if (el.type === "sphere") {
          const radius = Math.min(Math.abs(w), Math.abs(h)) / 2;
          ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(cx, cy, radius, radius * 0.25, 0, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(cx, cy, radius * 0.25, radius, 0, 0, 2 * Math.PI);
          ctx.stroke();
        } else if (el.type === "cylinder") {
          const rx = Math.abs(w) / 2;
          const ry = Math.abs(h) * 0.08;
          ctx.ellipse(cx, y1 + ry, rx, ry, 0, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(cx, y2 - ry, rx, ry, 0, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(x1, y1 + ry);
          ctx.lineTo(x1, y2 - ry);
          ctx.moveTo(x2, y1 + ry);
          ctx.lineTo(x2, y2 - ry);
          ctx.stroke();
        } else if (el.type === "cone") {
          const rx = Math.abs(w) / 2;
          const ry = Math.abs(h) * 0.08;
          ctx.ellipse(cx, y2 - ry, rx, ry, 0, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx, y1);
          ctx.lineTo(x1, y2 - ry);
          ctx.moveTo(cx, y1);
          ctx.lineTo(x2, y2 - ry);
          ctx.stroke();
        } else if (el.type === "pyramid") {
          const dx = w * 0.15;
          const dy = h * 0.15;
          const p1 = { x: x1 + dx, y: y2 - dy };
          const p2 = { x: x2 - dx, y: y2 - dy };
          const p3 = { x: x2, y: y2 };
          const p4 = { x: x1, y: y2 };
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.lineTo(p4.x, p4.y);
          ctx.closePath();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx, y1);
          ctx.lineTo(p1.x, p1.y);
          ctx.moveTo(cx, y1);
          ctx.lineTo(p2.x, p2.y);
          ctx.moveTo(cx, y1);
          ctx.lineTo(p3.x, p3.y);
          ctx.moveTo(cx, y1);
          ctx.lineTo(p4.x, p4.y);
          ctx.stroke();
        } else if (el.type === "prism") {
          const dx = w * 0.25;
          const dy = h * 0.25;
          const f1 = { x: x1, y: y2 };
          const f2 = { x: x1 + (w - dx) * 0.5, y: y1 + dy };
          const f3 = { x: x1 + (w - dx), y: y2 };
          ctx.moveTo(f1.x, f1.y);
          ctx.lineTo(f2.x, f2.y);
          ctx.lineTo(f3.x, f3.y);
          ctx.closePath();
          ctx.stroke();
          const b1 = { x: x1 + dx, y: y2 - dy };
          const b2 = { x: x1 + dx + (w - dx) * 0.5, y: y1 };
          const b3 = { x: x2, y: y2 - dy };
          ctx.beginPath();
          ctx.moveTo(b1.x, b1.y);
          ctx.lineTo(b2.x, b2.y);
          ctx.lineTo(b3.x, b3.y);
          ctx.closePath();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(f1.x, f1.y);
          ctx.lineTo(b1.x, b1.y);
          ctx.moveTo(f2.x, f2.y);
          ctx.lineTo(b2.x, b2.y);
          ctx.moveTo(f3.x, f3.y);
          ctx.lineTo(b3.x, b3.y);
          ctx.stroke();
        } else if (el.type === "torus") {
          ctx.ellipse(
            cx,
            cy,
            Math.abs(w) / 2,
            Math.abs(h) / 2,
            0,
            0,
            2 * Math.PI,
          );
          ctx.stroke();
          ctx.beginPath();
          ctx.ellipse(
            cx,
            cy,
            Math.abs(w) / 3,
            Math.abs(h) / 3,
            0,
            0,
            2 * Math.PI,
          );
          ctx.stroke();
        } else if (el.type === "tetrahedron") {
          const p1 = { x: x1 + w * 0.2, y: y2 - h * 0.1 };
          const p2 = { x: x2 - w * 0.2, y: y2 - h * 0.1 };
          const p3 = { x: cx, y: y2 };
          const apex = { x: cx, y: y1 };
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.closePath();
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(apex.x, apex.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.moveTo(apex.x, apex.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.moveTo(apex.x, apex.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.stroke();
        }

        // Draw visual length measurements if enabled
        if (showMeasurements) {
          const PIXELS_PER_CM = 37.8;
          if (el.type === "line" || el.type === "arrow") {
            const lengthCm = (r / PIXELS_PER_CM).toFixed(1);
            const angle = Math.atan2(y2 - y1, x2 - x1);
            const mx = cx + 12 * Math.cos(angle - Math.PI / 2);
            const my = cy + 12 * Math.sin(angle - Math.PI / 2);
            drawMeasurement(
              ctx,
              `${lengthCm} ${language === "ar" ? "سم" : "cm"}`,
              mx,
              my,
              angle,
            );
          } else if (el.type === "rect") {
            const wCm = (Math.abs(w) / PIXELS_PER_CM).toFixed(1);
            const hCm = (Math.abs(h) / PIXELS_PER_CM).toFixed(1);
            const topY = Math.min(y1, y2) - 10;
            drawMeasurement(
              ctx,
              `${wCm} ${language === "ar" ? "سم" : "cm"}`,
              cx,
              topY,
            );
            const rightX = Math.max(x1, x2) + 15;
            drawMeasurement(
              ctx,
              `${hCm} ${language === "ar" ? "سم" : "cm"}`,
              rightX,
              cy,
              Math.PI / 2,
            );
          } else if (el.type === "circle" || el.type === "sphere") {
            const rCm = (r / PIXELS_PER_CM).toFixed(1);
            drawMeasurement(
              ctx,
              `r = ${rCm} ${language === "ar" ? "سم" : "cm"}`,
              x1,
              y1 - 10,
            );

            ctx.save();
            ctx.strokeStyle = el.color;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.restore();
          } else if (el.type === "triangle" || el.type === "right_triangle") {
            const baseCm = (Math.abs(w) / PIXELS_PER_CM).toFixed(1);
            const heightCm = (Math.abs(h) / PIXELS_PER_CM).toFixed(1);
            const baseY = Math.max(y1, y2) + 12;
            drawMeasurement(
              ctx,
              `${language === "ar" ? "القاعدة" : "Base"}: ${baseCm} ${language === "ar" ? "سم" : "cm"}`,
              cx,
              baseY,
            );
            const heightX =
              el.type === "right_triangle" ? Math.min(x1, x2) - 15 : cx;
            const heightY = cy;
            drawMeasurement(
              ctx,
              `${language === "ar" ? "الارتفاع" : "Height"}: ${heightCm} ${language === "ar" ? "سم" : "cm"}`,
              heightX,
              heightY,
              el.type === "right_triangle" ? Math.PI / 2 : 0,
            );
          } else if (
            el.type === "cube" ||
            el.type === "cylinder" ||
            el.type === "cone" ||
            el.type === "pyramid"
          ) {
            const wCm = (Math.abs(w) / PIXELS_PER_CM).toFixed(1);
            const hCm = (Math.abs(h) / PIXELS_PER_CM).toFixed(1);
            drawMeasurement(
              ctx,
              `${wCm} x ${hCm} ${language === "ar" ? "سم" : "cm"}`,
              cx,
              Math.min(y1, y2) - 10,
            );
          }
        }

        // Draw visual selection highlights if the element is selected
        if (selectedElementId === el.id) {
          ctx.save();
          ctx.strokeStyle = "#3b82f6"; // Clean blue selection outline
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);

          if (
            el.x1 !== undefined &&
            el.y1 !== undefined &&
            el.x2 !== undefined &&
            el.y2 !== undefined
          ) {
            const x1 = el.x1 * (zoom / 100);
            const y1 = el.y1 * (zoom / 100);
            const x2 = el.x2 * (zoom / 100);
            const y2 = el.y2 * (zoom / 100);
            const minX = Math.min(x1, x2) - 8;
            const maxX = Math.max(x1, x2) + 8;
            const minY = Math.min(y1, y2) - 8;
            const maxY = Math.max(y1, y2) + 8;
            ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

            // Render corner resize handles
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "#3b82f6";
            ctx.lineWidth = 1.5;
            const handles = [
              { x: minX, y: minY },
              { x: maxX, y: minY },
              { x: minX, y: maxY },
              { x: maxX, y: maxY },
            ];
            handles.forEach((h) => {
              ctx.fillRect(h.x - 3, h.y - 3, 6, 6);
              ctx.strokeRect(h.x - 3, h.y - 3, 6, 6);
            });
          } else if (el.points && el.points.length > 0) {
            const xs = el.points.map((p) => p.x * (zoom / 100));
            const ys = el.points.map((p) => p.y * (zoom / 100));
            const minX = Math.min(...xs) - 8;
            const maxX = Math.max(...xs) + 8;
            const minY = Math.min(...ys) - 8;
            const maxY = Math.max(...ys) + 8;
            ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

            // Corner handles
            ctx.fillStyle = "#ffffff";
            ctx.strokeStyle = "#3b82f6";
            ctx.lineWidth = 1.5;
            const handles = [
              { x: minX, y: minY },
              { x: maxX, y: minY },
              { x: minX, y: maxY },
              { x: maxX, y: maxY },
            ];
            handles.forEach((h) => {
              ctx.fillRect(h.x - 3, h.y - 3, 6, 6);
              ctx.strokeRect(h.x - 3, h.y - 3, 6, 6);
            });
          }
          ctx.restore();
        }
      }
    });

    ctx.restore();
  };

  // Re-render when elements, zoom, panOffset, or selectedElementId changes
  useEffect(() => {
    redrawCanvas();
  }, [elements, zoom, panOffset, selectedElementId, showMeasurements]);

  // Prevent default scroll/pan behaviors on touch screens when inside the Whiteboard
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const preventTouchDefault = (e: TouchEvent) => {
      // Prevent scrolling or zooming the actual viewport when drawing/touching the canvas
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    // Use passive: false to override modern browser passive touch event defaults
    canvas.addEventListener("touchstart", preventTouchDefault, { passive: false });
    canvas.addEventListener("touchmove", preventTouchDefault, { passive: false });
    canvas.addEventListener("gesturestart", preventTouchDefault, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", preventTouchDefault);
      canvas.removeEventListener("touchmove", preventTouchDefault);
      canvas.removeEventListener("gesturestart", preventTouchDefault);
    };
  }, [view]);

  // Actions for board drawing
  const getMousePos = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // Support both Touch and Mouse
    let clientX, clientY;
    if ("touches" in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left - panOffset.x) / (zoom / 100),
      y: (clientY - rect.top - panOffset.y) / (zoom / 100),
    };
  };

  const handleMouseDown = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    let clientX, clientY;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      if (e.cancelable) {
        e.preventDefault();
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Universal Middle-click Pan
    if ("button" in e && e.button === 1) {
      setIsPanning(true);
      setStartPan({ x: clientX, y: clientY });
      return;
    }

    // Hand Pan Tool
    if (activeTool === "pan") {
      setIsPanning(true);
      setStartPan({ x: clientX, y: clientY });
      return;
    }

    // Shape / Path Selection Tool
    if (activeTool === "select") {
      const pos = getMousePos(e);
      // Find elements to select and drag, check in reverse order (topmost first)
      const clickedEl = [...elements].reverse().find((el) => {
        if (
          el.x1 !== undefined &&
          el.y1 !== undefined &&
          el.x2 !== undefined &&
          el.y2 !== undefined
        ) {
          const minX = Math.min(el.x1, el.x2);
          const maxX = Math.max(el.x1, el.x2);
          const minY = Math.min(el.y1, el.y2);
          const maxY = Math.max(el.y1, el.y2);
          return (
            pos.x >= minX - 15 &&
            pos.x <= maxX + 15 &&
            pos.y >= minY - 15 &&
            pos.y <= maxY + 15
          );
        } else if (el.points && el.points.length > 0) {
          // Freehand Pencil/Eraser curve select proximity
          return el.points.some(
            (p) =>
              Math.sqrt(Math.pow(p.x - pos.x, 2) + Math.pow(p.y - pos.y, 2)) <
              20,
          );
        }
        return false;
      });

      if (clickedEl) {
        setSelectedElementId(clickedEl.id);
        setDraggedElement({
          id: clickedEl.id,
          startX: pos.x,
          startY: pos.y,
        });
      } else {
        setSelectedElementId(null);
      }
      return;
    }

    const pos = getMousePos(e);
    setIsDrawing(true);

    if (activeTool === "pen" || activeTool === "ai-pen" || activeTool === "eraser") {
      const newElement: DrawElement = {
        id: `el-${Date.now()}`,
        type: activeTool,
        points: [pos],
        color:
          activeTool === "eraser"
            ? `rgba(0, 0, 0, ${eraserOpacity / 100})`
            : activeTool === "ai-pen"
            ? "#7c3aed"
            : brushColor,
        width: activeTool === "eraser" ? eraserSize : brushWidth,
      };

      const newElements = [...elements, newElement];
      setElements(newElements);
      updateHistory(newElements);
    } else if (activeTool === "text") {
      // Account for panning and zoom positioning
      setTextInputPosition({
        x: pos.x * (zoom / 100) + panOffset.x,
        y: pos.y * (zoom / 100) + panOffset.y,
      });
      setEditingTextValue("");
      setIsDrawing(false);
    } else {
      // Shapes
      const newElement: DrawElement = {
        id: `el-${Date.now()}`,
        type: activeTool,
        x1: pos.x,
        y1: pos.y,
        x2: pos.x,
        y2: pos.y,
        color: brushColor,
        width: brushWidth,
      };
      const newElements = [...elements, newElement];
      setElements(newElements);
      updateHistory(newElements);
    }
  };

  const handleMouseMove = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    let clientX, clientY;
    if ("touches" in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      if (e.cancelable) {
        e.preventDefault();
      }
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Process Hand Pan Dragging
    if (isPanning && startPan) {
      const dx = clientX - startPan.x;
      const dy = clientY - startPan.y;
      setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setStartPan({ x: clientX, y: clientY });
      return;
    }

    // Process Shape Selection Dragging
    if (activeTool === "select" && draggedElement) {
      const pos = getMousePos(e);
      const dx = pos.x - draggedElement.startX;
      const dy = pos.y - draggedElement.startY;

      setElements((prevElements) =>
        prevElements.map((el) => {
          if (el.id === draggedElement.id) {
            if (
              el.x1 !== undefined &&
              el.y1 !== undefined &&
              el.x2 !== undefined &&
              el.y2 !== undefined
            ) {
              return {
                ...el,
                x1: el.x1 + dx,
                y1: el.y1 + dy,
                x2: el.x2 + dx,
                y2: el.y2 + dy,
              };
            } else if (el.points) {
              return {
                ...el,
                points: el.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
              };
            }
          }
          return el;
        }),
      );

      setDraggedElement({
        id: draggedElement.id,
        startX: pos.x,
        startY: pos.y,
      });
      return;
    }

    if (!isDrawing || elements.length === 0) return;

    const pos = getMousePos(e);
    const updatedElements = [...elements];
    const activeIndex = updatedElements.length - 1;
    const current = updatedElements[activeIndex];

    if ((activeTool === "pen" || activeTool === "ai-pen" || activeTool === "eraser") && current.points) {
      current.points = [...current.points, pos];
      setElements(updatedElements);
    } else if (
      activeTool !== "text" &&
      activeTool !== "select" &&
      activeTool !== "pan"
    ) {
      current.x2 = pos.x;
      current.y2 = pos.y;
      setElements(updatedElements);
    }
  };

  const processAiPenDrawing = async () => {
    const aiPenElements = elements.filter((el) => el.type === "ai-pen");
    if (aiPenElements.length === 0) return;

    // Calculate bounding box of all points in ai-pen elements
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    aiPenElements.forEach((el) => {
      if (el.points) {
        el.points.forEach((p) => {
          if (p.x < minX) minX = p.x;
          if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.y > maxY) maxY = p.y;
        });
      }
    });

    if (minX === Infinity || maxX === -Infinity || minY === Infinity || maxY === -Infinity) {
      return;
    }

    setIsAiConverting(true);
    setAiPenStatusText(
      language === "ar"
        ? "جاري التعرف على الكتابة بالذكاء الاصطناعي..."
        : "AI is recognizing handwriting..."
    );

    try {
      // Create offscreen canvas for rendering the handwriting
      const canvas = document.createElement("canvas");
      const padding = 24;
      const width = (maxX - minX) + padding * 2;
      const height = (maxY - minY) + padding * 2;
      
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Clear canvas with a white background for premium contrast and perfect OCR accuracy
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // Style the stroke drawing: clean, high-contrast black line
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        aiPenElements.forEach((el) => {
          if (el.points && el.points.length > 0) {
            ctx.beginPath();
            ctx.moveTo(el.points[0].x - minX + padding, el.points[0].y - minY + padding);
            for (let i = 1; i < el.points.length; i++) {
              ctx.lineTo(el.points[i].x - minX + padding, el.points[i].y - minY + padding);
            }
            ctx.stroke();
          }
        });
      }

      const base64Image = canvas.toDataURL("image/png");

      const response = await fetch("/api/ai-pen/recognize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: base64Image }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      if (data.text && data.text.trim().length > 0) {
        // Create an elegant new Text element positioned perfectly
        const textId = `el-${Date.now()}`;
        const newTextElement: DrawElement = {
          id: textId,
          type: "text",
          x1: minX,
          y1: minY + 15,
          x2: maxX,
          y2: minY + 65, // estimated height
          color: brushColor,
          width: Math.max(4, Math.min(10, brushWidth)), // Scale size nicely
          text: data.text.trim(),
        };

        // Filter out the raw 'ai-pen' stroke elements and append the new styled text element
        const remainingElements = elements.filter((el) => el.type !== "ai-pen");
        const updatedElements = [...remainingElements, newTextElement];
        
        setElements(updatedElements);
        updateHistory(updatedElements);
      } else {
        // If not recognized clearly, keep the raw strokes so user doesn't lose their input
        console.log("No text recognized.");
      }
    } catch (err) {
      console.error("AI Pen recognition failed:", err);
    } finally {
      setIsAiConverting(false);
      setAiPenStatusText("");
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    setIsPanning(false);
    setStartPan(null);

    // AI Pen auto-convert trigger
    if (activeTool === "ai-pen") {
      if (aiRecognitionTimeoutRef.current) {
        clearTimeout(aiRecognitionTimeoutRef.current);
      }
      aiRecognitionTimeoutRef.current = setTimeout(() => {
        processAiPenDrawing();
      }, 1500);
    }

    // Save state after dragging in Selection mode
    if (activeTool === "select" && draggedElement) {
      updateHistory(elements);
    }
    setDraggedElement(null);
  };

  // Undo / Redo
  const updateHistory = (newElements: DrawElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, newElements]);
    setHistoryIndex(newHistory.length);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setElements(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setElements(history[historyIndex + 1]);
    }
  };

  const handleClear = () => {
    setElements([]);
    updateHistory([]);
  };

  // Adding text elements to canvas
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTextValue.trim() || !textInputPosition) {
      setTextInputPosition(null);
      return;
    }

    const newElement: DrawElement = {
      id: `text-${Date.now()}`,
      type: "text",
      x1: textInputPosition.x / (zoom / 100),
      y1: textInputPosition.y / (zoom / 100),
      color: brushColor,
      width: brushWidth,
      text: editingTextValue,
    };

    const newElements = [...elements, newElement];
    setElements(newElements);
    updateHistory(newElements);
    setTextInputPosition(null);
    setEditingTextValue("");
  };

  // Sticky Note Actions
  const handleAddSticky = () => {
    const id = `note-${Date.now()}`;
    const colors: ("yellow" | "blue" | "green" | "pink" | "purple")[] = [
      "yellow",
      "blue",
      "green",
      "pink",
      "purple",
    ];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // Spawn sticky notes near top center
    const newNote: StickyNote = {
      id,
      x: 300 + Math.random() * 100,
      y: 200 + Math.random() * 100,
      text:
        language === "ar"
          ? "اكتب بطاقتك الجديدة هنا..."
          : "Double click to type task details...",
      color: randomColor,
      width: 200,
      height: 140,
    };
    setStickyNotes([...stickyNotes, newNote]);
  };

  const updateStickyText = (id: string, text: string) => {
    setStickyNotes(stickyNotes.map((n) => (n.id === id ? { ...n, text } : n)));
  };

  const deleteSticky = (id: string) => {
    setStickyNotes(stickyNotes.filter((n) => n.id !== id));
  };

  const handleNoteDragStart = (
    id: string,
    e: React.MouseEvent | React.TouchEvent,
  ) => {
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const note = stickyNotes.find((n) => n.id === id);
    if (note) {
      setDraggedNote({
        id,
        offsetX: clientX - note.x,
        offsetY: clientY - note.y,
      });
    }
  };

  const handleToolDragStart = (
    id: string,
    action: "drag" | "rotate" | "resize",
    e: React.MouseEvent | React.TouchEvent,
  ) => {
    e.stopPropagation();
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const tool = geoTools.find((t) => t.id === id);
    if (tool) {
      const dx = clientX - tool.x;
      const dy = clientY - tool.y;
      const startMouseAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const startRotOffset = tool.rotation - startMouseAngle;
      const startDist = Math.sqrt(dx * dx + dy * dy);

      setActiveToolDrag({
        id,
        action,
        startX: clientX,
        startY: clientY,
        startRot: tool.rotation,
        startRotOffset: startRotOffset,
        startWidth: tool.width || (tool.type === "protractor" ? 280 : 260),
        startRadius: tool.radius || 100,
        startDist: startDist || 100,
      });
    }
  };

  const handleGlobalMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (draggedNote) {
      let clientX, clientY;
      if ("touches" in e) {
        if (e.touches.length === 0) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      setStickyNotes(
        stickyNotes.map((note) => {
          if (note.id === draggedNote.id) {
            return {
              ...note,
              x: clientX - draggedNote.offsetX,
              y: clientY - draggedNote.offsetY,
            };
          }
          return note;
        }),
      );
    }

    if (activeToolDrag) {
      let clientX, clientY;
      if ("touches" in e) {
        if (e.touches.length === 0) return;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const { id, action, startX, startY } = activeToolDrag;

      setGeoTools((prevTools) =>
        prevTools.map((tool) => {
          if (tool.id !== id) return tool;

          if (action === "drag") {
            const dx = clientX - startX;
            const dy = clientY - startY;
            return {
              ...tool,
              x: tool.x + dx,
              y: tool.y + dy,
            };
          } else if (action === "rotate") {
            const dx = clientX - tool.x;
            const dy = clientY - tool.y;
            const currentMouseAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
            const offset =
              activeToolDrag.startRotOffset !== undefined
                ? activeToolDrag.startRotOffset
                : 0;
            let angleDeg = currentMouseAngle + offset;
            if (angleDeg < 0) angleDeg += 360;
            angleDeg = angleDeg % 360;
            return {
              ...tool,
              rotation: angleDeg,
            };
          } else if (action === "resize") {
            const dx = clientX - tool.x;
            const dy = clientY - tool.y;
            const currentDist = Math.sqrt(dx * dx + dy * dy);

            const startDist = activeToolDrag.startDist || 100;
            const startWidth =
              activeToolDrag.startWidth ||
              (tool.type === "protractor" ? 280 : 260);
            const startRadius = activeToolDrag.startRadius || 100;
            const ratio = currentDist / startDist;

            if (tool.type === "ruler") {
              return {
                ...tool,
                width: Math.max(150, Math.min(800, startWidth * ratio)),
              };
            } else if (tool.type === "protractor") {
              return {
                ...tool,
                width: Math.max(160, Math.min(800, startWidth * ratio)),
              };
            } else if (tool.type === "setsquare") {
              return {
                ...tool,
                width: Math.max(120, Math.min(700, startWidth * ratio)),
              };
            } else if (tool.type === "compass") {
              return {
                ...tool,
                radius: Math.max(40, Math.min(400, startRadius * ratio)),
              };
            }
          }
          return tool;
        }),
      );

      if (action === "drag") {
        setActiveToolDrag({
          ...activeToolDrag,
          startX: clientX,
          startY: clientY,
        });
      }
    }
  };

  const handleGlobalMouseUp = () => {
    setDraggedNote(null);
    setActiveToolDrag(null);
    handleMouseUp();
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Allows panning the infinite canvas with scroll wheel or trackpad
    setPanOffset((prev) => ({
      x: prev.x - e.deltaX,
      y: prev.y - e.deltaY,
    }));
  };

  // Convert canvas to image and trigger download
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Create a temporary canvas with actual slate white background to save nicely
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) return;

    // Background
    tempCtx.fillStyle = "#f8fafc";
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw Grid if chosen
    if (gridType === "dots") {
      tempCtx.fillStyle = "#cbd5e1";
      for (let x = 0; x < tempCanvas.width; x += 24) {
        for (let y = 0; y < tempCanvas.height; y += 24) {
          tempCtx.fillRect(x, y, 1.5, 1.5);
        }
      }
    } else if (gridType === "grid") {
      tempCtx.strokeStyle = "#e2e8f0";
      tempCtx.lineWidth = 1;
      for (let x = 0; x < tempCanvas.width; x += 24) {
        tempCtx.beginPath();
        tempCtx.moveTo(x, 0);
        tempCtx.lineTo(x, tempCanvas.height);
        tempCtx.stroke();
      }
      for (let y = 0; y < tempCanvas.height; y += 24) {
        tempCtx.beginPath();
        tempCtx.moveTo(0, y);
        tempCtx.lineTo(tempCanvas.width, y);
        tempCtx.stroke();
      }
    }

    // Copy drawing
    tempCtx.drawImage(canvas, 0, 0);

    // Download image
    const link = document.createElement("a");
    link.download = `${boardTitle.trim().replace(/\s+/g, "_") || "novaboard_lesson"}.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
  };

  // Generating fully customized single-file Blogger embed code!
  const bloggerCode = useMemo(() => {
    return `<!DOCTYPE html>
<html lang="${language}" dir="${language === "ar" ? "rtl" : "ltr"}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NovaBoard | Premium SaaS Interactive Whiteboard</title>
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- Google Fonts for modern Arabic & English -->
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: ${language === "ar" ? "'Cairo', sans-serif" : "'Plus Jakarta Sans', sans-serif"};
      background-color: #f8fafc;
      color: #0f172a;
    }
    .board-bg-dots {
      background-image: radial-gradient(#cbd5e1 1.2px, transparent 1.2px);
      background-size: 24px 24px;
    }
    .board-bg-grid {
      background-image: linear-gradient(#cbd5e1 0.8px, transparent 0.8px), linear-gradient(90deg, #cbd5e1 0.8px, transparent 0.8px);
      background-size: 24px 24px;
    }
  </style>
</head>
<body class="w-full min-h-screen relative flex flex-col overflow-x-hidden antialiased select-none">

  <!-- ================= LANDING PAGE VIEW ================= -->
  <div id="landingView" class="w-full min-h-screen flex flex-col bg-[#f8fafc] z-40 transition-all duration-500">
    <!-- Navbar -->
    <nav class="w-full py-4 px-6 md:px-12 border-b border-slate-200/60 bg-white/70 backdrop-blur-md sticky top-0 z-50 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logoNGradientBlogger" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stop-color="#2563EB" />
                <stop offset="50%" stop-color="#3B82F6" />
                <stop offset="100%" stop-color="#8B5CF6" />
              </linearGradient>
            </defs>
            <rect x="14" y="14" width="72" height="72" rx="12" stroke="#0c1524" stroke-width="3.5" fill="white" />
            <rect x="7" y="19" width="4.5" height="4.5" fill="#3B82F6" rx="1" />
            <rect x="2" y="25" width="5" height="5" fill="#00D2FF" rx="1" />
            <rect x="8" y="29" width="6" height="6" fill="#8B5CF6" rx="1.5" />
            <rect x="4" y="11" width="3" height="3" fill="#00D2FF" rx="0.5" />
            <path d="M76 27 L79 24 L80 25 L77 28 Z" stroke="#0F172A" stroke-width="1" />
            <path d="M76 38 L80 41 L78 42 L79 44.5 L78 45 L77 43 L76 45 Z" stroke="#0F172A" stroke-width="1" stroke-linejoin="round" />
            <rect x="75.5" y="49" width="5" height="5" rx="1.2" stroke="#0F172A" stroke-width="1" />
            <circle cx="78" cy="62" r="1.2" fill="#8B5CF6" />
            <circle cx="78" cy="67" r="1.2" fill="#8B5CF6" />
            <circle cx="78" cy="72" r="1.2" fill="#8B5CF6" />
            <path d="M26,68 L26,34 C26,26 30,22 35,22 C40,22 45,28 48,34 L60,58 C62,62 65,64 68,64 C71,64 73,60 73,54 L73,22 L80,22 L80,54 C80,64 74,70 68,70 C62,70 57,64 54,58 L42,34 C40,30 38,28 36,28 C34,28 33,30 33,32 L33,68 Z" fill="url(#logoNGradientBlogger)" />
          </svg>
        </div>
        <span class="font-extrabold text-xl tracking-tight text-slate-800">${language === "ar" ? "نوفا بورد" : "NovaBoard"}</span>
      </div>
      
      <button onclick="launchBoard()" class="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm hover:shadow-md cursor-pointer">
        ${language === "ar" ? "تشغيل السبورة التفاعلية" : "Launch Whiteboard"}
      </button>
    </nav>

    <!-- Hero Section -->
    <section class="py-16 px-6 md:px-12 max-w-5xl mx-auto text-center flex flex-col items-center gap-6 relative">
      <!-- Glow background -->
      <div class="absolute w-72 h-72 rounded-full bg-indigo-200/30 blur-3xl -top-10 left-1/4 -z-10"></div>
      <div class="absolute w-72 h-72 rounded-full bg-violet-200/30 blur-3xl top-20 right-1/4 -z-10"></div>

      <span class="px-3 py-1 bg-indigo-50 border border-indigo-100/80 rounded-full text-[10px] font-extrabold text-indigo-600 uppercase tracking-widest animate-pulse">
        ${language === "ar" ? "✨ سبورة تفاعلية فاخرة لمعلمي بلوجر المتميزين" : "✨ Modern SaaS Whiteboard for blogger teachers"}
      </span>
      <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15] max-w-4xl">
        ${language === "ar" ? "الجيل الجديد من السبورات التفاعلية الفاخرة" : "The elegant whiteboard crafted for visionary educators"}
      </h1>
      <p class="text-slate-600 text-sm md:text-base leading-relaxed max-w-2xl">
        ${language === "ar" ? "منصة ذكية متكاملة، فائقة السرعة، ومصممة بجمال هندسي متقن. صُممت خصيصاً لتعمل بكفاءة مطلقة داخل مدونات Blogger وقوالبها بدون أي تأثير على سرعة التصفح." : "A beautiful, self-contained interactive board. Built with geometric balance to embed seamlessly into any Blogger template without compromising page speed."}
      </p>

      <div class="flex items-center gap-4 mt-4">
        <button onclick="launchBoard()" class="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-2xl hover:shadow-indigo-200 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0">
          ${language === "ar" ? "ابدأ تشغيل السبورة مجاناً" : "Launch Whiteboard Now"}
        </button>
      </div>

      <!-- Preview Mockup (Linear / Apple style) -->
      <div class="w-full mt-12 bg-white border border-slate-200 rounded-3xl shadow-2xl p-3 max-w-4xl relative overflow-hidden group">
        <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        <div class="flex items-center justify-between border-b border-slate-100 pb-3 px-2">
          <div class="flex items-center gap-1.5">
            <span class="w-3 h-3 rounded-full bg-rose-400"></span>
            <span class="w-3 h-3 rounded-full bg-amber-400"></span>
            <span class="w-3 h-3 rounded-full bg-emerald-400"></span>
          </div>
          <span class="text-[10px] font-bold text-slate-400">novaboard_blogger_preview.png</span>
          <span class="w-16"></span>
        </div>
        <div class="bg-slate-50 border border-slate-100 rounded-2xl p-6 h-64 md:h-80 flex flex-col items-center justify-center relative cursor-pointer" onclick="launchBoard()">
          <div class="absolute inset-0 board-bg-dots opacity-70"></div>
          
          <div class="relative z-10 flex flex-col items-center gap-4 text-center">
            <div class="w-16 h-16 bg-white border border-slate-100 rounded-2xl shadow-lg flex items-center justify-center text-indigo-600 animate-bounce">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </div>
            <div>
              <p class="font-extrabold text-lg text-slate-800">${language === "ar" ? "اضغط لتشغيل السبورة والبدء في الشرح والكتابة" : "Click to activate whiteboard and start drawing"}</p>
              <p class="text-xs text-slate-400 mt-1">${language === "ar" ? "يدعم الأقلام الذكية، البطاقات اللاصقة، وتصدير الدروس كصور PNG" : "Supports smart drawing, floating cards, and exporting lessons as images"}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Bento Grid Features Section -->
    <section class="py-16 bg-white border-y border-slate-200/50 px-6 md:px-12">
      <div class="max-w-5xl mx-auto">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-extrabold tracking-tight text-slate-900">${language === "ar" ? "أدوات ذكية ومتقنة للتعليم البصري" : "Smart Tools Built For Visual Instruction"}</h2>
          <p class="text-slate-500 text-xs md:text-sm mt-2 max-w-lg mx-auto">${language === "ar" ? "كل ما تحتاجه لتقديم شروحات رائعة وتبسيط الدروس لطلابك." : "Everything needed to render stunning lessons and explain structures."}</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div class="p-6 rounded-2xl bg-[#f8fafc] border border-slate-100 flex flex-col gap-3 hover:border-indigo-100 hover:shadow-lg transition-all duration-300">
            <div class="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </div>
            <h3 class="font-extrabold text-sm text-slate-800">${language === "ar" ? "رسم ذكي فائق السلاسة" : "Ultra-smooth smart pen"}</h3>
            <p class="text-xs text-slate-500 leading-relaxed">${language === "ar" ? "مستوحى من نظام Apple للرسم، يتيح لك الرسم الحر، الأشكال الهندسية المتوازنة كالمستطيلات والدوائر والخطوط المستقيمة." : "Inspired by Apple drawing systems, allowing smooth pen inputs, rectangles, circles, and arrow connectors."}</p>
          </div>

          <div class="p-6 rounded-2xl bg-[#f8fafc] border border-slate-100 flex flex-col gap-3 hover:border-amber-100 hover:shadow-lg transition-all duration-300">
            <div class="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/></svg>
            </div>
            <h3 class="font-extrabold text-sm text-slate-800">${language === "ar" ? "بطاقات لاصقة عائمة وملونة" : "Floating Interactive Notes"}</h3>
            <p class="text-xs text-slate-500 leading-relaxed">${language === "ar" ? "أضف ملاحظات دراسية ملونة، قوائم مهام، وأفكار تفاعلية يمكن سحبها وتحريكها في أي مكان لتنظيم المحتوى التعليمي." : "Add colorful lesson cards, task bullet lists, or guidelines. Drag and organize them dynamically to construct visual outlines."}</p>
          </div>

          <div class="p-6 rounded-2xl bg-[#f8fafc] border border-slate-100 flex flex-col gap-3 hover:border-emerald-100 hover:shadow-lg transition-all duration-300">
            <div class="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m4.9 19.1 14.2-14.2"/></svg>
            </div>
            <h3 class="font-extrabold text-sm text-slate-800">${language === "ar" ? "تحميل كصور وتوافق كامل" : "High-Res PNG Export"}</h3>
            <p class="text-xs text-slate-500 leading-relaxed">${language === "ar" ? "احفظ شروحاتك كاملة بضغطة زر واحدة كصورة عالية الدقة PNG لمشاركتها مع الطلاب عبر مواقع التواصل." : "Export your fully detailed sketches instantly to crisp high-res PNG images for easy dissemination on social media or class channels."}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Teacher Benefits Section -->
    <section class="py-16 px-6 md:px-12 max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12">
      <div class="flex-1 flex flex-col gap-5">
        <span class="text-xs font-bold uppercase text-indigo-600 tracking-wider">${language === "ar" ? "مزايا حصرية للمدونات التعليمية" : "Blogger Dedicated Benefits"}</span>
        <h2 class="text-3xl font-extrabold text-slate-900 leading-tight">${language === "ar" ? "صُممت لتجعل مدونتك التعليمية في القمة" : "Make your educational blog stand out from the rest"}</h2>
        <p class="text-slate-600 text-xs md:text-sm leading-relaxed">${language === "ar" ? "معظم الإضافات والسبورات تبطئ موقعك وتتطلب اشتراكات معقدة. نوفا بورد خفيفة كلياً وتعمل في المتصفح وتضمن عدم هروب الزوار بسبب بطء التصفح." : "Most whiteboard tools require subscriptions or slow down blogger pages with bulky scripts. NovaBoard is programmed in vanilla JS, load-optimized, and free of trackers."}</p>
        
        <ul class="flex flex-col gap-3 mt-2">
          <li class="flex items-center gap-3 text-xs font-bold text-slate-700">
            <span class="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">✓</span>
            <span>${language === "ar" ? "خفيفة للغاية: حجم كود لا يتعدى بضع كيلوبايتات" : "Zero bloat: under 20KB total weight"}</span>
          </li>
          <li class="flex items-center gap-3 text-xs font-bold text-slate-700">
            <span class="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">✓</span>
            <span>${language === "ar" ? "تجاوب مطلق: تعمل على الهواتف والأجهزة اللوحية والحواسيب" : "Fully responsive on phones, tablets, and desktops"}</span>
          </li>
          <li class="flex items-center gap-3 text-xs font-bold text-slate-700">
            <span class="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">✓</span>
            <span>${language === "ar" ? "بدون قواعد بيانات: تعمل كلياً في المتصفح بأمان مطلق" : "No database required: operates securely client-side"}</span>
          </li>
        </ul>
      </div>
      <div class="flex-1 w-full flex justify-center">
        <div class="p-8 rounded-3xl bg-slate-950 text-white border border-slate-800 shadow-2xl relative overflow-hidden flex flex-col gap-4 max-w-sm">
          <div class="absolute w-24 h-24 rounded-full bg-indigo-500/10 blur-xl top-0 right-0"></div>
          <span class="text-[10px] font-extrabold uppercase text-indigo-400 tracking-wider">${language === "ar" ? "نصيحة المعلم الممتاز" : "Educator Tip"}</span>
          <p class="text-sm font-semibold leading-relaxed text-slate-300">
            "${language === "ar" ? "بعد تضمين الكود في Blogger، يمكن للطلاب استخدام السبورة للتفاعل المباشر وحل المسائل الرياضية ورسم المخططات مباشرة أمامك!" : "After embedding inside Blogger, students can solve mathematical tasks, scribble notes, or interact with diagrams directly in real-time!"}"
          </p>
          <div class="flex items-center gap-3 mt-2 border-t border-slate-800 pt-3">
            <div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-extrabold text-white">N</div>
            <div>
              <p class="text-xs font-extrabold text-white">${language === "ar" ? "أ. أحمد علي" : "Prof. Alan Turing"}</p>
              <p class="text-[10px] text-slate-500">${language === "ar" ? "معلم متميز ومدون رياضيات" : "Master Math Educator"}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Subjects support visual showcase -->
    <section class="py-16 bg-[#f1f5f9]/50 border-t border-slate-200/50 px-6 md:px-12">
      <div class="max-w-5xl mx-auto text-center">
        <h2 class="text-3xl font-extrabold text-slate-900 mb-8">${language === "ar" ? "دعم متكامل لجميع المواد الدراسية" : "Suited For Every Single Subject"}</h2>
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
          <div class="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col items-center gap-2">
            <span class="text-2xl">📐</span>
            <span class="text-xs font-extrabold text-slate-800">${language === "ar" ? "الرياضيات والهندسة" : "Math & Geometry"}</span>
          </div>
          <div class="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col items-center gap-2">
            <span class="text-2xl">⚡</span>
            <span class="text-xs font-extrabold text-slate-800">${language === "ar" ? "الفيزياء والعلوم" : "Physics & Sciences"}</span>
          </div>
          <div class="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col items-center gap-2">
            <span class="text-2xl">📝</span>
            <span class="text-xs font-extrabold text-slate-800">${language === "ar" ? "اللغات والآداب" : "Languages & Arts"}</span>
          </div>
          <div class="p-4 rounded-xl bg-white border border-slate-200 shadow-sm flex flex-col items-center gap-2">
            <span class="text-2xl">🎨</span>
            <span class="text-xs font-extrabold text-slate-800">${language === "ar" ? "الرسم والتصميم" : "Creative Sketching"}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Statistics -->
    <section class="py-12 bg-white border-t border-slate-200/50 px-6 md:px-12">
      <div class="max-w-5xl mx-auto grid grid-cols-3 gap-6 text-center">
        <div>
          <p class="text-3xl md:text-4xl font-black text-indigo-600">0.02s</p>
          <p class="text-[10px] md:text-xs font-extrabold text-slate-500 uppercase mt-1">${language === "ar" ? "زمن التحميل الفوري" : "Instant Page Load"}</p>
        </div>
        <div>
          <p class="text-3xl md:text-4xl font-black text-indigo-600">15k+</p>
          <p class="text-[10px] md:text-xs font-extrabold text-slate-500 uppercase mt-1">${language === "ar" ? "معلم يستخدمها" : "Teachers Engaged"}</p>
        </div>
        <div>
          <p class="text-3xl md:text-4xl font-black text-indigo-600">100%</p>
          <p class="text-[10px] md:text-xs font-extrabold text-slate-500 uppercase mt-1">${language === "ar" ? "توافق مع Blogger" : "Blogger Integration"}</p>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="py-16 px-6 md:px-12 max-w-4xl mx-auto">
      <div class="bg-indigo-650 rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden shadow-2xl flex flex-col items-center gap-5">
        <div class="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-700 -z-10"></div>
        <div class="absolute w-64 h-64 bg-white/5 rounded-full blur-2xl top-0 left-0"></div>
        
        <h2 class="text-3xl font-extrabold">${language === "ar" ? "ابدأ بتعزيز مدونتك التعليمية اليوم!" : "Elevate Your Blog Lectures Today!"}</h2>
        <p class="text-indigo-100 text-xs md:text-sm max-w-xl leading-relaxed">
          ${language === "ar" ? "نقرة واحدة تفصلك عن امتلاك أفضل سبورة بيضاء تفاعلية تدعم المعلمين ومصممة بأحدث تكنولوجيا السحابة." : "One click separates you from using the highly optimized, responsive, and elegant digital classroom classroom."}
        </p>
        <button onclick="launchBoard()" class="mt-4 px-8 py-4 bg-white text-indigo-600 hover:bg-slate-50 font-black text-sm rounded-2xl shadow-xl transition-all hover:scale-105 cursor-pointer">
          ${language === "ar" ? "تشغيل السبورة مجاناً الآن" : "Launch Whiteboard Free"}
        </button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="mt-auto py-8 border-t border-slate-200/50 bg-slate-50 text-center text-xs text-slate-400">
      <p>© ${new Date().getFullYear()} NovaBoard. ${language === "ar" ? "جميع الحقوق محفوظة." : "All rights reserved."}</p>
    </footer>
  </div>



  <!-- ================= INTERACTIVE WHITEBOARD APP ================= -->
  <div id="whiteboardView" class="hidden w-full h-screen flex-col relative overflow-hidden">
    <!-- Background Grid Layer -->
    <div id="boardBg" class="absolute inset-0 board-bg-dots transition-all duration-300"></div>

    <!-- Board Header -->
    <header class="relative z-20 px-6 py-3 flex items-center justify-between border-b border-slate-200 bg-white/70 backdrop-blur-md">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logoNGradientBloggerWhiteboard" x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stop-color="#2563EB" />
                  <stop offset="50%" stop-color="#3B82F6" />
                  <stop offset="100%" stop-color="#8B5CF6" />
                </linearGradient>
              </defs>
              <rect x="14" y="14" width="72" height="72" rx="12" stroke="#0c1524" stroke-width="3.5" fill="white" />
              <rect x="7" y="19" width="4.5" height="4.5" fill="#3B82F6" rx="1" />
              <rect x="2" y="25" width="5" height="5" fill="#00D2FF" rx="1" />
              <rect x="8" y="29" width="6" height="6" fill="#8B5CF6" rx="1.5" />
              <rect x="4" y="11" width="3" height="3" fill="#00D2FF" rx="0.5" />
              <path d="M76 27 L79 24 L80 25 L77 28 Z" stroke="#0F172A" stroke-width="1" />
              <path d="M76 38 L80 41 L78 42 L79 44.5 L78 45 L77 43 L76 45 Z" stroke="#0F172A" stroke-width="1" stroke-linejoin="round" />
              <rect x="75.5" y="49" width="5" height="5" rx="1.2" stroke="#0F172A" stroke-width="1" />
              <circle cx="78" cy="62" r="1.2" fill="#8B5CF6" />
              <circle cx="78" cy="67" r="1.2" fill="#8B5CF6" />
              <circle cx="78" cy="72" r="1.2" fill="#8B5CF6" />
              <path d="M26,68 L26,34 C26,26 30,22 35,22 C40,22 45,28 48,34 L60,58 C62,62 65,64 68,64 C71,64 73,60 73,54 L73,22 L80,22 L80,54 C80,64 74,70 68,70 C62,70 57,64 54,58 L42,34 C40,30 38,28 36,28 C34,28 33,30 33,32 L33,68 Z" fill="url(#logoNGradientBloggerWhiteboard)" />
            </svg>
          </div>
          <span class="font-bold text-lg tracking-tight text-slate-800">${language === "ar" ? "نوفا بورد" : "NovaBoard"}</span>
        </div>
        <div class="h-5 w-px bg-slate-200 mx-1"></div>
        <span class="text-xs font-semibold px-2 py-1 rounded bg-indigo-50 text-indigo-600 border border-indigo-100">${language === "ar" ? "سبورة تفاعلية" : "Interactive Session"}</span>
      </div>

      <div class="flex items-center gap-3">
        <button onclick="clearCanvas()" class="px-3 py-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100 text-xs font-bold rounded-lg transition-all cursor-pointer">
          ${language === "ar" ? "مسح السبورة" : "Clear Board"}
        </button>
        <button onclick="downloadPNG()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          ${language === "ar" ? "حفظ كصورة" : "Save Image"}
        </button>
        <button onclick="goBackToLanding()" class="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-all cursor-pointer">
          ${language === "ar" ? "الرجوع للرئيسية" : "Home Portal"}
        </button>
      </div>
    </header>

    <!-- Canvas Workspace -->
    <main id="canvasContainer" class="relative flex-1 w-full h-full overflow-hidden">
      <canvas id="paintCanvas" class="absolute inset-0 z-10 cursor-crosshair"></canvas>
      <div id="stickyContainer" class="absolute inset-0 z-20 pointer-events-none"></div>
    </main>

    <!-- Bottom Settings Bar -->
    <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/95 backdrop-blur-md border border-slate-200 px-5 py-3 rounded-2xl shadow-xl z-30 pointer-events-auto">
      <div class="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
        <button onclick="changeGrid('dots')" class="px-2.5 py-1 text-xs font-semibold rounded hover:bg-white transition-all cursor-pointer">${language === "ar" ? "نقاط" : "Dots"}</button>
        <button onclick="changeGrid('grid')" class="px-2.5 py-1 text-xs font-semibold rounded hover:bg-white transition-all cursor-pointer">${language === "ar" ? "مربعات" : "Grid"}</button>
        <button onclick="changeGrid('none')" class="px-2.5 py-1 text-xs font-semibold rounded hover:bg-white transition-all cursor-pointer">${language === "ar" ? "بيضاء" : "Plain"}</button>
      </div>

      <div class="h-4 w-px bg-slate-200"></div>

      <button onclick="addStickyNote()" class="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-200 transition-all cursor-pointer">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        ${language === "ar" ? "إضافة بطاقة" : "Add Note"}
      </button>
    </div>

    <!-- Left Toolbar -->
    <nav class="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3.5 p-3 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl z-30">
      <button id="btn-pen" onclick="setTool('pen')" class="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 transition-all cursor-pointer" title="${language === "ar" ? "قلم" : "Pen"}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      </button>
      <button id="btn-eraser" onclick="setTool('eraser')" class="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition-all cursor-pointer" title="${language === "ar" ? "ممحاة" : "Eraser"}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H7L3 16l8-8 9 9-2 3z"/></svg>
      </button>
      
      <div class="h-px bg-slate-200 mx-1"></div>

      <!-- Quick Colors -->
      <div class="flex flex-col gap-1.5 items-center">
        <button onclick="setColor('#4f46e5')" class="w-6 h-6 rounded-full bg-indigo-600 border border-white ring-2 ring-indigo-100 cursor-pointer"></button>
        <button onclick="setColor('#f43f5e')" class="w-6 h-6 rounded-full bg-rose-500 border border-white cursor-pointer"></button>
        <button onclick="setColor('#10b981')" class="w-6 h-6 rounded-full bg-emerald-500 border border-white cursor-pointer"></button>
        <button onclick="setColor('#0f172a')" class="w-6 h-6 rounded-full bg-slate-900 border border-white cursor-pointer"></button>
      </div>
    </nav>
  </div>

  <!-- Interactive Logic -->
  <script>
    const canvas = document.getElementById('paintCanvas');
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('canvasContainer');
    const stickyContainer = document.getElementById('stickyContainer');
    const boardBg = document.getElementById('boardBg');

    let activeTool = 'pen';
    let isDrawing = false;
    let strokeColor = '#4f46e5';
    let strokeWidth = 4;
    let startX = 0;
    let startY = 0;

    function launchBoard() {
      document.getElementById('landingView').style.display = 'none';
      document.getElementById('whiteboardView').style.display = 'flex';
      setTimeout(resizeCanvas, 100);
    }

    function goBackToLanding() {
      document.getElementById('landingView').style.display = 'flex';
      document.getElementById('whiteboardView').style.display = 'none';
    }

    function resizeCanvas() {
      const tempImg = canvas.toDataURL();
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      const img = new Image();
      img.onload = function() {
        ctx.drawImage(img, 0, 0);
      };
      img.src = tempImg;
    }
    window.addEventListener('resize', resizeCanvas);

    function setColor(color) {
      strokeColor = color;
    }

    function changeGrid(type) {
      boardBg.className = 'absolute inset-0 transition-all duration-300';
      if (type === 'dots') boardBg.classList.add('board-bg-dots');
      else if (type === 'grid') boardBg.classList.add('board-bg-grid');
    }

    function setTool(tool) {
      activeTool = tool;
      document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('bg-indigo-50', 'text-indigo-600', 'border', 'border-indigo-100');
        btn.classList.add('text-slate-500');
      });
      const activeBtn = document.getElementById('btn-' + tool);
      if (activeBtn) {
        activeBtn.classList.remove('text-slate-500');
        activeBtn.classList.add('bg-indigo-50', 'text-indigo-600', 'border', 'border-indigo-100');
      }
    }

    function getMousePos(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
    }

    function startDrawing(e) {
      isDrawing = true;
      const pos = getMousePos(e);
      startX = pos.x;
      startY = pos.y;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      
      if (activeTool === 'pen') {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      } else if (activeTool === 'eraser') {
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = strokeWidth * 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }

    function draw(e) {
      if (!isDrawing) return;
      const pos = getMousePos(e);
      if (activeTool === 'pen' || activeTool === 'eraser') {
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
      }
    }

    function stopDrawing() {
      if (!isDrawing) return;
      isDrawing = false;
      ctx.closePath();
    }

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDrawing);

    canvas.addEventListener('touchstart', (e) => { startDrawing(e); e.preventDefault(); });
    canvas.addEventListener('touchmove', (e) => { draw(e); e.preventDefault(); });
    canvas.addEventListener('touchend', stopDrawing);

    function clearCanvas() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stickyContainer.innerHTML = '';
    }

    function downloadPNG() {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.fillStyle = '#f8fafc';
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
      tempCtx.drawImage(canvas, 0, 0);

      const link = document.createElement('a');
      link.download = 'novaboard_lesson.png';
      link.href = tempCanvas.toDataURL('image/png');
      link.click();
    }

    let noteId = 0;
    function addStickyNote() {
      noteId++;
      const note = document.createElement('div');
      note.id = 'note-' + noteId;
      note.className = 'absolute bg-amber-100 border border-amber-200 rounded-xl p-3 shadow-lg pointer-events-auto cursor-move select-none';
      note.style.width = '200px';
      note.style.left = '100px';
      note.style.top = '150px';

      note.innerHTML = \`
        <div class="flex justify-between items-center mb-1 pb-1 border-b border-amber-200">
          <span class="text-[9px] font-bold text-amber-800 uppercase">\${language === "ar" ? "ملاحظة" : "Note"}</span>
          <button onclick="this.parentElement.parentElement.remove()" class="text-amber-700 hover:text-amber-950 font-bold text-xs cursor-pointer">×</button>
        </div>
        <textarea class="w-full bg-transparent border-none resize-none focus:outline-none text-xs text-amber-900" rows="3">\${language === "ar" ? "اكتب درسك هنا..." : "Type note content..."}</textarea>
      \`;
      dragElement(note);
      stickyContainer.appendChild(note);
    }

    function dragElement(elmnt) {
      let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
      elmnt.onmousedown = dragMouseDown;

      function dragMouseDown(e) {
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
      }

      function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
        elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
      }

      function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
      }
    }
  </script>
</body>
</html>`;
  }, [language]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(bloggerCode);
    setCopiedBlogger(true);
    setTimeout(() => setCopiedBlogger(false), 3000);
  };

  const subjectsList = [
    { id: "math", nameAr: "الرياضيات والهندسة", nameEn: "Mathematics & Geometry", descAr: "أدوات هندسية، مسطرة ومنقلة ومثلث قائم، رسم أشكال ثلاثية ورباعية الأبعاد بدقة فائقة.", descEn: "Geometric tools, rulers, protractors, and set-squares, highly precise 2D & 3D shape drawing.", color: "from-blue-500 to-indigo-600", icon: Ruler },
    { id: "physics", nameAr: "الفيزياء والميكانيكا", nameEn: "Physics & Mechanics", descAr: "تمثيل القوى، الرسوم التوضيحية للمتجهات، والأسهم التوجيهية التفاعلية لشرح الحركة.", descEn: "Force representation, vector diagrams, and highly interactive pointer arrows.", color: "from-purple-500 to-pink-600", icon: Zap },
    { id: "chemistry", nameAr: "الكيمياء والروابط", nameEn: "Chemistry & Bonds", descAr: "رسم الروابط الكيميائية الثنائية والثلاثية، وتوضيح المركبات السداسية والمجموعات العضوية بيسر.", descEn: "Draw chemical bonds, and illustrate hexagonal molecular structures and functional groups easily.", color: "from-emerald-500 to-teal-600", icon: Box },
    { id: "english", nameAr: "اللغات والكتابة", nameEn: "Languages & Linguistics", descAr: "خطوط إرشادية للكتابة، بطاقات لاصقة للمفردات، ونصوص ملونة منسقة لتسهيل القواعد والتهجئة.", descEn: "Writing guide lines, vocabulary sticky notes, and beautifully styled text elements.", color: "from-amber-500 to-orange-600", icon: Type },
    { id: "arts", nameAr: "الفنون والتربية الفنية", nameEn: "Arts & Free Drawing", descAr: "قلم حر فائق السلاسة، تدرجات لونية زاهية، وممحاة نقاط ذكية لمسح دقيق وإبداع بلا حدود.", descEn: "Super smooth freehand pen, vibrant gradients, and smart point eraser for precision.", color: "from-rose-500 to-red-600", icon: Palette },
  ];

  const filteredBoards = useMemo(() => {
    if (!boardSearch.trim()) return userBoards;
    return userBoards.filter((board) =>
      (board.title || "").toLowerCase().includes(boardSearch.toLowerCase())
    );
  }, [userBoards, boardSearch]);

  return (
    <>
      {view === "contact" ? (
        <ContactUs language={language} onBack={() => setView("landing")} />
      ) : view === "privacy" ? (
        <PrivacyPolicy language={language} onBack={() => setView("landing")} />
      ) : view === "landing" ? (
        <div
          className="w-full min-h-screen bg-slate-50/70 text-slate-900 font-sans flex flex-col relative overflow-x-hidden antialiased scroll-smooth selection:bg-indigo-100 selection:text-indigo-900"
          dir={language === "ar" ? "rtl" : "ltr"}
        >
          {/* Futuristic Glowing Grid Orbs Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:30px_30px] opacity-25 pointer-events-none" />
          <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-indigo-300/20 to-purple-300/20 blur-[130px] -top-96 left-1/2 -translate-x-1/2 pointer-events-none animate-pulse duration-[8000ms]" />
          <div className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-br from-violet-200/20 to-fuchsia-200/20 blur-[100px] top-[40%] left-[10%] pointer-events-none" />
          <div className="absolute w-[400px] h-[400px] rounded-full bg-gradient-to-bl from-pink-200/15 to-rose-200/15 blur-[100px] top-[60%] right-[10%] pointer-events-none" />

          {/* Floating Aesthetic Math Symbols */}
          <div className="absolute top-32 left-8 md:left-24 text-indigo-400/20 font-mono text-xs md:text-sm pointer-events-none select-none animate-bounce duration-[6000ms]">
            sin(θ) = y/r
          </div>
          <div className="absolute top-48 right-12 md:right-32 text-purple-400/20 font-mono text-xs md:text-sm pointer-events-none select-none animate-bounce duration-[8000ms]">
            a² + b² = c²
          </div>
          <div className="absolute bottom-1/4 left-1/3 text-pink-400/15 font-mono text-sm md:text-base pointer-events-none select-none animate-pulse duration-[5000ms]">
            ∫ e^x dx
          </div>
          <div className="absolute top-2/3 left-10 text-emerald-400/15 font-mono text-sm pointer-events-none select-none animate-pulse duration-[7000ms]">
            E = mc²
          </div>

          {/* Luxury Navigation Header */}
          <header className="w-full py-4 px-6 md:px-12 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between transition-all">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView("landing")}>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <NovaBoardLogo size={36} showText={true} showTagline={false} language={language} />
              </motion.div>
            </div>

            <div className="flex items-center gap-4">
              {/* Premium Language Switcher */}
              <button
                onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100/80 hover:bg-slate-200/80 hover:text-indigo-600 border border-slate-200/50 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Globe size={13} className="text-slate-500" />
                {language === "ar" ? "English" : "عربي"}
              </button>



              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-xl">
                    {user.photoURL && (
                      <img
                        src={user.photoURL}
                        alt="User Profile"
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-full border border-indigo-200"
                      />
                    )}
                    <span className="text-xs font-bold text-indigo-950 hidden sm:inline-block">
                      {user.displayName?.split(" ")[0]}
                    </span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLogout}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg border border-rose-200/50 transition-colors cursor-pointer"
                  >
                    {language === "ar" ? "خروج" : "Logout"}
                  </motion.button>
                </div>
              ) : (
                <motion.button
                  whileHover={isLoggingIn ? {} : { scale: 1.02 }}
                  whileTap={isLoggingIn ? {} : { scale: 0.98 }}
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className={`px-4 py-2 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 border border-indigo-500/30 ${
                    isLoggingIn
                      ? "bg-indigo-400 cursor-not-allowed shadow-none"
                      : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 cursor-pointer"
                  }`}
                >
                  {isLoggingIn ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Globe size={14} />
                  )}
                  {isLoggingIn
                    ? (language === "ar" ? "جاري الدخول..." : "Signing in...")
                    : (language === "ar" ? "بوابة المعلم" : "Teacher Login")}
                </motion.button>
              )}
            </div>
          </header>

          <main className="flex-1 w-full max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20 flex flex-col gap-16 md:gap-24 relative z-10">
            
            {/* Hero Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Left Column (Main Marketing Copy) */}
              <div className="lg:col-span-7 flex flex-col items-start text-start gap-6">
                
                {/* Premium Glow Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 text-indigo-700 text-xs font-bold shadow-sm">
                  <Sparkles size={13} className="text-indigo-600 animate-pulse" />
                  <span>
                    {language === "ar"
                      ? "سبورة هندسية تعليمية بمميزات فائقة 🎨"
                      : "SaaS grade educational smartboard 🎨"}
                  </span>
                </div>

                <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-950 tracking-tight leading-[1.15]">
                  {language === "ar" ? (
                    <>
                      مستقبل التعليم <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">
                        التفاعلي الذكي
                      </span>
                    </>
                  ) : (
                    <>
                      The visionary whiteboard <br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">
                        crafted for genius minds
                      </span>
                    </>
                  )}
                </h1>

                <p className="text-slate-600 text-base md:text-xl font-medium leading-relaxed max-w-xl">
                  {language === "ar"
                    ? "ارتقِ بشروحاتك إلى آفاق غير مسبوقة. واجهة سحابية متكاملة، أدوات رسم دقيقة، ومساطر ومنقلات هندسية تفاعلية مصممة بدقة متناهية لتعمل بسلاسة فائقة."
                    : "Deliver legendary lessons. A stunning interactive workspace with precise vector tools, fully interactive math objects, and ultra-lightweight architecture."}
                </p>

                {/* Instant Action CTA Panel */}
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mt-2">
                  {user ? (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={createNewBoard}
                        className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-base font-bold shadow-xl shadow-indigo-200 hover:shadow-indigo-300/40 transition-all flex items-center justify-center gap-3 w-full sm:w-auto cursor-pointer border border-indigo-500/50"
                      >
                        <Plus size={20} className="animate-pulse" />
                        {language === "ar" ? "ابدأ تشغيل السبورة الآن" : "Launch Whiteboard"}
                      </motion.button>
                      
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          const boardroomEl = document.getElementById("boardroom-cabinet");
                          if (boardroomEl) {
                            boardroomEl.scrollIntoView({ behavior: "smooth" });
                          }
                        }}
                        className="px-6 py-4 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-base font-bold shadow-md hover:shadow-lg border border-slate-200 transition-all flex items-center justify-center gap-2 w-full sm:w-auto cursor-pointer"
                      >
                        <LayoutGrid size={18} className="text-indigo-600" />
                        {language === "ar" ? "تصفح أعمالك المحفوظة" : "Browse Saved Boards"}
                      </motion.button>
                    </>
                  ) : (
                    <motion.button
                      whileHover={isLoggingIn ? {} : { scale: 1.05 }}
                      whileTap={isLoggingIn ? {} : { scale: 0.95 }}
                      onClick={handleLogin}
                      disabled={isLoggingIn}
                      className={`px-8 py-4 text-white rounded-2xl text-base font-bold shadow-xl transition-all flex items-center justify-center gap-3 w-full sm:w-auto border border-indigo-500/50 ${
                        isLoggingIn
                          ? "bg-indigo-400 cursor-not-allowed shadow-none"
                          : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 hover:shadow-indigo-300/40 cursor-pointer"
                      }`}
                    >
                      {isLoggingIn ? (
                        <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Globe size={20} className="animate-pulse" />
                      )}
                      {isLoggingIn
                        ? (language === "ar" ? "جاري تسجيل الدخول..." : "Signing in...")
                        : (language === "ar" ? "تسجيل الدخول الفوري للبدء (مطلوب)" : "Sign in to Start (Required)")}
                    </motion.button>
                  )}
                </div>

                {!user && (
                  <button
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                    className={`text-xs font-bold transition-colors flex items-center gap-1.5 mt-1 ${isLoggingIn ? "text-indigo-400 cursor-not-allowed" : "text-slate-500 hover:text-indigo-600 cursor-pointer"}`}
                  >
                    {isLoggingIn ? (
                      <div className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Info size={13} />
                    )}
                    {isLoggingIn
                      ? (language === "ar" ? "جاري تسجيل الدخول..." : "Signing in...")
                      : (language === "ar"
                          ? "تسجيل الدخول السريع بضغطة زر مجاناً ببريدك التعليمي أو الشخصي"
                          : "Fast secure login with your Google educational or personal email")}
                  </button>
                )}

                {/* Micro Statistics / Highlights Row */}
                <div className="grid grid-cols-3 gap-4 w-full mt-8 pt-6 border-t border-slate-200/60">
                  <div className="flex flex-col items-start text-start">
                    <span className="text-2xl md:text-3xl font-black text-indigo-600">15+</span>
                    <span className="text-[10px] md:text-xs font-bold text-slate-500 mt-1 leading-tight">
                      {language === "ar" ? "أداة هندسية متطورة" : "Advanced Geo Tools"}
                    </span>
                  </div>
                  <div className="flex flex-col items-start text-start border-l border-slate-200/60 rtl:border-l-0 rtl:border-r pl-4 rtl:pl-0 rtl:pr-4">
                    <span className="text-2xl md:text-3xl font-black text-purple-600">100%</span>
                    <span className="text-[10px] md:text-xs font-bold text-slate-500 mt-1 leading-tight">
                      {language === "ar" ? "حفظ سحابي فوري" : "Instant Cloud Sync"}
                    </span>
                  </div>
                  <div className="flex flex-col items-start text-start border-l border-slate-200/60 rtl:border-l-0 rtl:border-r pl-4 rtl:pl-0 rtl:pr-4">
                    <span className="text-2xl md:text-3xl font-black text-pink-600">Free</span>
                    <span className="text-[10px] md:text-xs font-bold text-slate-500 mt-1 leading-tight">
                      {language === "ar" ? "تعليمي ومجاني بالكامل" : "100% Free for Schools"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column (Futuristic Interactive Device Preview) */}
              <div className="lg:col-span-5 relative">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-fuchsia-500/10 rounded-3xl blur-2xl opacity-80 pointer-events-none" />
                
                {/* Board Frame mockup */}
                <div className="relative bg-white/80 border border-slate-200/80 rounded-3xl shadow-[0_25px_60px_-15px_rgba(15,23,42,0.12)] backdrop-blur-md overflow-hidden p-4">
                  
                  {/* Chrome window header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 mb-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <div className="w-3 h-3 rounded-full bg-emerald-400" />
                    </div>
                    <div className="px-3 py-0.5 bg-slate-100 rounded-lg text-[9px] font-mono text-slate-500">
                      novaboard.edu/sandbox
                    </div>
                    <div className="w-6" />
                  </div>

                  {/* Dynamic Interactive Tabs inside mockup */}
                  <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl mb-4 border border-slate-200/50">
                    {(
                      [
                        { id: "draw", labelAr: "الرسم", labelEn: "Draw" },
                        { id: "geo", labelAr: "الهندسة", labelEn: "Geometry" },
                        { id: "notes", labelAr: "الملاحظات", labelEn: "Notes" },
                        { id: "export", labelAr: "التصدير", labelEn: "Export" },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setMockupTab(tab.id)}
                        className={`py-1.5 text-[10px] md:text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          mockupTab === tab.id
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-slate-500 hover:bg-slate-200/60"
                        }`}
                      >
                        {language === "ar" ? tab.labelAr : tab.labelEn}
                      </button>
                    ))}
                  </div>

                  {/* Mockup Canvas sandbox */}
                  <div className="relative h-60 bg-slate-50 border border-slate-200/60 rounded-2xl overflow-hidden p-3 flex flex-col justify-between">
                    
                    {/* Background Grid Pattern Simulator */}
                    <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

                    <AnimatePresence mode="wait">
                      {mockupTab === "draw" && (
                        <motion.div
                          key="draw"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="relative flex-1 flex flex-col justify-between z-10"
                        >
                          <div className="flex-1 flex items-center justify-center relative">
                            {/* Beautiful mathematical hand-drawn-style path */}
                            <svg width="180" height="100" viewBox="0 0 180 100" className="overflow-visible">
                              <motion.path
                                d="M 10 50 Q 45 10 90 50 T 170 50"
                                fill="none"
                                stroke={mockPenColor}
                                strokeWidth="4"
                                strokeLinecap="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 1.5, repeat: Infinity, repeatType: "loop", repeatDelay: 1 }}
                              />
                              {/* Vector dot highlights */}
                              <circle cx="10" cy="50" r="4" fill="#0f172a" />
                              <circle cx="90" cy="50" r="4" fill="#0f172a" />
                              <circle cx="170" cy="50" r="4" fill="#0f172a" />
                            </svg>

                            <div className="absolute bottom-2 text-[9px] font-bold text-slate-400 bg-white/70 px-2 py-0.5 rounded-full shadow-sm">
                              {language === "ar" ? "اضغط على الألوان في الأسفل لتغيير لون الرسم الحر!" : "Click colors below to change the live pen color!"}
                            </div>
                          </div>

                          {/* Interactive color picker in preview */}
                          <div className="flex items-center justify-center gap-3 pt-2 border-t border-slate-200/50">
                            {(
                              [
                                { value: "#4f46e5", bg: "bg-indigo-600" },
                                { value: "#f43f5e", bg: "bg-rose-500" },
                                { value: "#10b981", bg: "bg-emerald-500" },
                                { value: "#f59e0b", bg: "bg-amber-500" },
                                { value: "#0f172a", bg: "bg-slate-900" },
                              ]
                            ).map((clr) => (
                              <button
                                key={clr.value}
                                onClick={() => setMockPenColor(clr.value)}
                                className={`w-5 h-5 rounded-full ${clr.bg} transition-all cursor-pointer ${
                                  mockPenColor === clr.value ? "ring-2 ring-indigo-500 ring-offset-2 scale-120" : "hover:scale-110"
                                }`}
                              />
                            ))}
                          </div>
                        </motion.div>
                      )}

                      {mockupTab === "geo" && (
                        <motion.div
                          key="geo"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="relative flex-1 flex flex-col justify-between z-10"
                        >
                          <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                            
                            {/* Ruler Mockup Container with dynamic rotation state */}
                            <motion.div
                              animate={{ rotate: rulerRotation }}
                              transition={{ type: "spring", stiffness: 100, damping: 15 }}
                              className="absolute w-48 h-10 bg-amber-100/80 border border-amber-300 rounded-lg shadow-sm flex flex-col justify-between p-1 select-none pointer-events-none"
                              style={{ x: -20, y: -20 }}
                            >
                              <div className="flex justify-between border-b border-amber-400/40 px-1">
                                {[0, 1, 2, 3, 4, 5].map((idx) => (
                                  <div key={idx} className="flex flex-col items-center">
                                    <div className="h-2 w-[1px] bg-amber-800" />
                                    <span className="text-[7px] font-mono font-bold text-amber-900 mt-0.5">{idx}</span>
                                  </div>
                                ))}
                              </div>
                              <span className="text-[7px] font-bold text-amber-900/60 uppercase tracking-widest text-center">Ruler • {rulerRotation}°</span>
                            </motion.div>

                            {/* Protractor Mockup Container */}
                            <motion.div
                              animate={{ rotate: protractorRotation }}
                              transition={{ type: "spring", stiffness: 100, damping: 15 }}
                              className="absolute w-32 h-32 bg-sky-50/50 border border-sky-300 rounded-full flex items-center justify-center pointer-events-none"
                              style={{ x: 40, y: 30 }}
                            >
                              <div className="w-28 h-14 border-t border-sky-400/60 rounded-t-full relative">
                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[6px] font-bold text-sky-800/80">PROTRACTOR</span>
                              </div>
                            </motion.div>

                          </div>

                          {/* Rotator Buttons Panel */}
                          <div className="flex items-center justify-center gap-3 pt-2 border-t border-slate-200/50">
                            <button
                              onClick={() => setRulerRotation((r) => r + 15)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-lg border border-amber-200 cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <RotateCw size={10} />
                              {language === "ar" ? "أدر المسطرة" : "Spin Ruler"}
                            </button>
                            <button
                              onClick={() => setProtractorRotation((r) => r - 15)}
                              className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 text-[10px] font-extrabold rounded-lg border border-sky-200 cursor-pointer flex items-center gap-1 shadow-sm"
                            >
                              <RotateCw size={10} />
                              {language === "ar" ? "أدر المنقلة" : "Spin Protractor"}
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {mockupTab === "notes" && (
                        <motion.div
                          key="notes"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="relative flex-1 flex flex-col justify-between z-10"
                        >
                          {/* Live Interactive Notes Grid inside preview */}
                          <div className="flex-1 grid grid-cols-3 gap-2 py-2">
                            {mockNotes.map((note) => (
                              <div
                                key={note.id}
                                className={`p-2 border rounded-xl shadow-xs flex flex-col justify-between transition-all ${
                                  note.color === "yellow"
                                    ? "bg-amber-100 border-amber-200 text-amber-900"
                                    : note.color === "blue"
                                      ? "bg-sky-100 border-sky-200 text-sky-900"
                                      : "bg-emerald-100 border-emerald-200 text-emerald-900"
                                }`}
                              >
                                <textarea
                                  value={note.text}
                                  onChange={(e) => {
                                    setMockNotes(
                                      mockNotes.map((n) =>
                                        n.id === note.id ? { ...n, text: e.target.value } : n
                                      )
                                    );
                                  }}
                                  className="w-full flex-1 bg-transparent border-none resize-none focus:outline-none text-[9px] font-bold leading-normal text-slate-800 p-0 placeholder:opacity-50"
                                  title={language === "ar" ? "اضغط للكتابة والتعديل" : "Click to edit text"}
                                />
                                <div className="flex justify-end pt-1 border-t border-black/5">
                                  {/* Color Cycle Button */}
                                  <button
                                    onClick={() => {
                                      const clrs: ("yellow" | "blue" | "green")[] = ["yellow", "blue", "green"];
                                      const nextIdx = (clrs.indexOf(note.color) + 1) % clrs.length;
                                      setMockNotes(
                                        mockNotes.map((n) =>
                                          n.id === note.id ? { ...n, color: clrs[nextIdx] } : n
                                        )
                                      );
                                    }}
                                    className="w-2.5 h-2.5 rounded-full bg-white border border-black/15 hover:scale-125 transition-transform cursor-pointer"
                                    title={language === "ar" ? "تغيير اللون" : "Cycle Color"}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="text-[8px] text-center font-bold text-slate-400 mt-1">
                            {language === "ar" ? "✍️ جرب الكتابة مباشرة داخل الملاحظات وتغيير ألوانها!" : "✍️ Try typing directly inside the sticky notes above!"}
                          </div>
                        </motion.div>
                      )}

                      {mockupTab === "export" && (
                        <motion.div
                          key="export"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="relative flex-1 flex flex-col justify-between z-10"
                        >
                          <div className="flex-1 flex flex-col justify-center gap-3 px-4">
                            
                            {/* PDF Export Row */}
                            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/60 shadow-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-red-100 text-red-600 rounded-lg flex items-center justify-center shrink-0">
                                  <Download size={14} />
                                </div>
                                <div className="flex flex-col text-start">
                                  <span className="text-[10px] font-bold text-slate-800">{language === "ar" ? "تصدير كـ PDF" : "Export as PDF"}</span>
                                  <span className="text-[8px] text-slate-400 font-medium">1200 x 800 Vector Output</span>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-[8px] font-extrabold text-slate-500 uppercase tracking-widest">Ready</span>
                            </div>

                            {/* Blogger Embed Row */}
                            <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200/60 shadow-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center shrink-0">
                                  <FileCode size={14} />
                                </div>
                                <div className="flex flex-col text-start">
                                  <span className="text-[10px] font-bold text-slate-800">{language === "ar" ? "تضمين Blogger" : "Blogger Embed"}</span>
                                  <span className="text-[8px] text-slate-400 font-medium">Vanilla Javascript Embed</span>
                                </div>
                              </div>
                              <button
                                onClick={copyToClipboard}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[9px] font-bold cursor-pointer transition-colors"
                              >
                                {copiedBlogger ? (language === "ar" ? "تم النسخ!" : "Copied!") : (language === "ar" ? "نسخ الكود" : "Copy Code")}
                              </button>
                            </div>

                          </div>
                          
                          <p className="text-[8px] font-black text-indigo-700 bg-indigo-50 py-1 rounded-lg text-center leading-relaxed">
                            {language === "ar" ? "⚡ يتم تصدير كل الصفحات كملف PDF واحد بضغطة زر داخل السبورة!" : "⚡ All board pages export into a single PDF with one simple click!"}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>

                  {/* Device home bar */}
                  <div className="w-24 h-1 bg-slate-300 rounded-full mx-auto mt-2" />
                </div>
              </div>

            </div>

            {/* Teacher's Workspace Cabin (بوابة المعلم لإدارة السبورات المحفوظة) */}
            {user && (
              <motion.div
                id="boardroom-cabinet"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="w-full bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-[0_15px_40px_rgba(15,23,42,0.04)] relative overflow-hidden scroll-mt-24"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-50 to-transparent rounded-full pointer-events-none" />
                
                {/* Boardroom Header */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-200/60 mb-6 relative z-10">
                  <div className="flex flex-col text-start">
                    <h2 className="text-2xl font-extrabold text-slate-950 flex items-center gap-2">
                      <LayoutGrid className="text-indigo-600" size={24} />
                      {language === "ar" ? "صندوق السبورات المحفوظة سحابياً" : "Your Cloud Board Cabinet"}
                    </h2>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                      {language === "ar" ? "ابحث في دروسك السابقة أو أنشئ سابورتك الجديدة للدرس القادم." : "Search through your saved lessons or immediately build a new board."}
                    </p>
                  </div>

                  {/* Top Bar Actions */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {/* Saved boards Search Input */}
                    <div className="relative w-full sm:w-60">
                      <Search className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={16} />
                      <input
                        type="text"
                        value={boardSearch}
                        onChange={(e) => setBoardSearch(e.target.value)}
                        placeholder={language === "ar" ? "ابحث عن سبورة أو درس..." : "Search board..."}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 text-xs font-bold rounded-xl"
                      />
                      {boardSearch && (
                        <button
                          onClick={() => setBoardSearch("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <button
                      onClick={createNewBoard}
                      className="px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center transition-colors border border-slate-800"
                    >
                      <Plus size={16} />
                      {language === "ar" ? "سبورة جديدة" : "New Board"}
                    </button>
                  </div>
                </div>

                {/* Grid of Saved Boards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBoards.length === 0 ? (
                    <div className="col-span-full py-12 px-4 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                      <LayoutGrid className="text-slate-300 mb-3" size={40} />
                      <span className="text-slate-500 text-sm font-bold">
                        {boardSearch.trim()
                          ? (language === "ar" ? "لا توجد نتائج تطابق بحثك." : "No boards match your search query.")
                          : (language === "ar" ? "لا توجد أي سبورات محفوظة سحابياً حالياً." : "No cloud boards saved yet.")}
                      </span>
                      {!boardSearch.trim() && (
                        <button
                          onClick={createNewBoard}
                          className="mt-4 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black rounded-xl transition-colors cursor-pointer border border-indigo-200"
                        >
                          {language === "ar" ? "أنشئ سبورتك الأولى الآن" : "Build Your First Board Now"}
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredBoards.map((board) => (
                      <motion.div
                        key={board.id}
                        whileHover={{ y: -4, shadow: "0 10px 25px -5px rgba(15,23,42,0.06)" }}
                        onClick={() => loadSpecificBoard(board, board.id)}
                        className="flex flex-col justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200/80 transition-all hover:bg-white cursor-pointer group text-start relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600 opacity-80" />

                        <div className="flex items-start justify-between gap-4 mb-3 pl-1.5">
                          <div className="flex items-center gap-3 truncate">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
                              <LayoutGrid size={18} />
                            </div>
                            <span className="font-extrabold text-slate-800 truncate text-sm leading-tight group-hover:text-indigo-600 transition-colors">
                              {board.title || (language === "ar" ? "درس بدون عنوان" : "Untitled Board")}
                            </span>
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => deleteBoard(board.id, e)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title={language === "ar" ? "حذف السبورة" : "Delete Board"}
                          >
                            <Trash2 size={14} />
                          </motion.button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pt-3 border-t border-slate-200/50 pl-1.5">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={12} className="text-slate-300" />
                            <span>
                              {board.updatedAt
                                ? new Date(board.updatedAt.seconds * 1000).toLocaleDateString(language === "ar" ? "ar-EG" : "en-US")
                                : (language === "ar" ? "تم التحديث الآن" : "Just updated")}
                            </span>
                          </div>
                          <span className="text-indigo-600 group-hover:translate-x-1 group-hover:rtl:-translate-x-1 transition-transform flex items-center gap-1">
                            {language === "ar" ? "فتح السبورة" : "Open Board"}
                            <ChevronRight size={12} className="rtl:rotate-180" />
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}

            {/* Active Subject Showcase Suite (مستكشف التخصصات التفاعلي) */}
            <div className="w-full flex flex-col items-center">
              <div className="text-center max-w-2xl mb-12">
                <h2 className="text-3xl font-black text-slate-950 tracking-tight">
                  {language === "ar" ? "لوحة تخصصات المناهج التعليمية" : "Interactive Curriculums Suite"}
                </h2>
                <p className="text-slate-500 text-sm font-bold mt-2 leading-relaxed">
                  {language === "ar"
                    ? "اختر تخصصك الدراسي لتستكشف كيف تدعمك سبورة نوفا بورد بأدوات ذكية مرنة في الحصة الشارحة."
                    : "Select your educational focus below to preview how NovaBoard adapts perfectly to your daily lessons."}
                </p>
              </div>

              {/* Dynamic Tabs */}
              <div className="flex flex-wrap items-center justify-center gap-2 mb-8 bg-slate-100 p-1.5 rounded-2xl border border-slate-200/50 max-w-4xl w-full">
                {subjectsList.map((subj) => {
                  const IconComponent = subj.icon;
                  const isActive = activeSubject === subj.id;
                  return (
                    <button
                      key={subj.id}
                      onClick={() => setActiveSubject(subj.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        isActive
                          ? "bg-slate-950 text-white shadow-md shadow-slate-900/10"
                          : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
                      }`}
                    >
                      <IconComponent size={14} className={isActive ? "text-indigo-400" : "text-slate-500"} />
                      <span>{language === "ar" ? subj.nameAr : subj.nameEn}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Display Area */}
              <AnimatePresence mode="wait">
                {subjectsList.map((subj) => {
                  if (subj.id !== activeSubject) return null;
                  const IconComponent = subj.icon;
                  return (
                    <motion.div
                      key={subj.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.25 }}
                      className="w-full max-w-4xl p-6 md:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-[0_15px_40px_rgba(0,0,0,0.02)] flex flex-col md:flex-row items-center gap-8 text-start relative overflow-hidden"
                    >
                      {/* Left Side: Copy */}
                      <div className="flex-1 flex flex-col gap-4 relative z-10">
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${subj.color} text-white flex items-center justify-center shadow-md`}>
                          <IconComponent size={24} />
                        </div>
                        <h3 className="text-xl font-black text-slate-950">
                          {language === "ar" ? subj.nameAr : subj.nameEn}
                        </h3>
                        <p className="text-slate-600 text-sm font-medium leading-relaxed">
                          {language === "ar" ? subj.descAr : subj.descEn}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                            {language === "ar" ? "أدوات مخصصة جاهزة ومدمجة" : "Optimized Dedicated Tools Preloaded"}
                          </span>
                        </div>
                      </div>

                      {/* Right Side: Interactive Mock Illustration matching subject */}
                      <div className="w-full md:w-80 h-48 rounded-2xl bg-slate-50 border border-slate-200/50 flex items-center justify-center relative overflow-hidden shrink-0">
                        <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:12px_12px] opacity-30 pointer-events-none" />
                        
                        {subj.id === "math" && (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <svg width="180" height="130" viewBox="0 0 180 130" className="overflow-visible">
                              <path d="M 10 110 L 170 110" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                              <path d="M 40 10 L 40 110" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                              <motion.path
                                d="M 40 30 L 140 110 L 40 110 Z"
                                fill="rgba(99, 102, 241, 0.08)"
                                stroke="#4f46e5"
                                strokeWidth="2.5"
                                strokeLinejoin="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 2 }}
                              />
                              <rect x="40" y="100" width="10" height="10" fill="none" stroke="#4f46e5" strokeWidth="1.5" />
                              <text x="30" y="70" fontSize="10" fontWeight="bold" fill="#4f46e5" textAnchor="end">a</text>
                              <text x="90" y="123" fontSize="10" fontWeight="bold" fill="#4f46e5" textAnchor="middle">b</text>
                              <text x="100" y="65" fontSize="10" fontWeight="bold" fill="#818cf8">c (Hypotenuse)</text>
                              <path d="M 120 110 A 20 20 0 0 1 125 98" fill="none" stroke="#6366f1" strokeWidth="1.5" />
                              <text x="110" y="103" fontSize="8" fontWeight="bold" fill="#6366f1">θ</text>
                            </svg>
                          </div>
                        )}

                        {subj.id === "physics" && (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <svg width="180" height="130" viewBox="0 0 180 130" className="overflow-visible">
                              <path d="M 20 110 L 160 110 L 160 30 Z" fill="rgba(244, 63, 94, 0.04)" stroke="#e2e8f0" strokeWidth="2" />
                              <line x1="20" y1="110" x2="160" y2="30" stroke="#94a3b8" strokeWidth="2.5" />
                              <path d="M 40 110 A 20 20 0 0 0 37 100" fill="none" stroke="#64748b" strokeWidth="1.5" />
                              <text x="45" y="105" fontSize="9" fontWeight="bold" fill="#64748b">α</text>
                              <g transform="rotate(-29.7 90 70)">
                                <motion.rect
                                  x="75"
                                  y="55"
                                  width="30"
                                  height="30"
                                  rx="3"
                                  fill="#f1f5f9"
                                  stroke="#0f172a"
                                  strokeWidth="2"
                                  initial={{ x: -20 }}
                                  animate={{ x: 10 }}
                                  transition={{ duration: 3, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                                />
                                <line x1="90" y1="70" x2="90" y2="105" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2 2" />
                                <polygon points="90,105 87,100 93,100" fill="#ef4444" />
                                <text x="96" y="98" fontSize="8" fontWeight="bold" fill="#ef4444">Fg</text>
                                <line x1="90" y1="70" x2="90" y2="35" stroke="#3b82f6" strokeWidth="1.5" />
                                <polygon points="90,35 87,40 93,40" fill="#3b82f6" />
                                <text x="96" y="42" fontSize="8" fontWeight="bold" fill="#3b82f6">Fn</text>
                                <line x1="90" y1="70" x2="55" y2="70" stroke="#f59e0b" strokeWidth="1.5" />
                                <polygon points="55,70 60,67 60,73" fill="#f59e0b" />
                                <text x="45" y="79" fontSize="8" fontWeight="bold" fill="#f59e0b">Ff</text>
                              </g>
                            </svg>
                          </div>
                        )}

                        {subj.id === "chemistry" && (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <svg width="180" height="130" viewBox="0 0 180 130" className="overflow-visible">
                              <g transform="translate(90, 65)">
                                <motion.polygon
                                  points="0,-40 34.6,-20 34.6,20 0,40 -34.6,20 -34.6,-20"
                                  fill="rgba(16, 185, 129, 0.05)"
                                  stroke="#10b981"
                                  strokeWidth="2"
                                  strokeLinejoin="round"
                                  initial={{ strokeDasharray: "200", strokeDashoffset: "200" }}
                                  animate={{ strokeDashoffset: "0" }}
                                  transition={{ duration: 2.5 }}
                                />
                                <motion.circle
                                  cx="0"
                                  cy="0"
                                  r="24"
                                  fill="none"
                                  stroke="#10b981"
                                  strokeWidth="1.5"
                                  strokeDasharray="6 4"
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                                />
                                <line x1="0" y1="-40" x2="0" y2="-60" stroke="#047857" strokeWidth="2" />
                                <text x="0" y="-66" fontSize="10" fontWeight="extrabold" fill="#047857" textAnchor="middle" fontFamily="monospace">CH₃</text>
                                <line x1="34.6" y1="20" x2="52" y2="30" stroke="#10b981" strokeWidth="1.5" />
                                <text x="56" y="38" fontSize="9" fontWeight="bold" fill="#047857" textAnchor="start" fontFamily="monospace">OH</text>
                                <line x1="-34.6" y1="20" x2="-52" y2="30" stroke="#10b981" strokeWidth="1.5" />
                                <text x="-56" y="38" fontSize="9" fontWeight="bold" fill="#047857" textAnchor="end" fontFamily="monospace">NO₂</text>
                              </g>
                            </svg>
                          </div>
                        )}

                        {subj.id === "english" && (
                          <div className="relative w-full h-full flex flex-col justify-center px-6 text-start gap-1">
                            <div className="relative w-full py-1">
                              <div className="absolute top-0 left-0 w-full h-[1px] bg-sky-200" />
                              <div className="absolute top-3 left-0 w-full h-[1px] bg-red-200/60 border-dashed border-b" />
                              <div className="absolute top-6 left-0 w-full h-[1px] bg-red-200/60 border-dashed border-b" />
                              <div className="absolute top-9 left-0 w-full h-[1px] bg-sky-200" />
                              <div className="h-10 flex items-center pl-4">
                                <motion.span
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 1 }}
                                  className="text-lg font-serif italic text-amber-900 tracking-wide select-none"
                                >
                                  NovaBoard
                                </motion.span>
                              </div>
                            </div>
                            <div className="mt-2 p-1.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-[10px] font-bold">
                              <span className="text-amber-950 font-serif">Welcome (English)</span>
                              <span className="text-slate-400">➔</span>
                              <span className="text-indigo-950 font-medium">مرحباً (عربي)</span>
                            </div>
                          </div>
                        )}

                        {subj.id === "arts" && (
                          <div className="relative w-full h-full flex items-center justify-center">
                            <svg width="180" height="130" viewBox="0 0 180 130" className="overflow-visible">
                              <motion.path
                                d="M 40 70 C 40 40, 140 40, 140 70 C 140 100, 110 110, 90 110 C 80 110, 75 100, 65 100 C 55 100, 40 100, 40 70 Z"
                                fill="#fafaf9"
                                stroke="#d6d3d1"
                                strokeWidth="2.5"
                                animate={{ scale: [1, 1.03, 1] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                              />
                              <ellipse cx="65" cy="65" rx="8" ry="12" fill="#cbd5e1" transform="rotate(-30 65 65)" />
                              <circle cx="95" cy="55" r="9" fill="#f43f5e" />
                              <circle cx="115" cy="65" r="8" fill="#3b82f6" />
                              <circle cx="110" cy="85" r="9" fill="#10b981" />
                              <circle cx="85" cy="95" r="7" fill="#f59e0b" />
                              <circle cx="50" cy="85" r="8" fill="#a855f7" />
                              <g transform="translate(130, 30) rotate(-45)">
                                <rect x="-3" y="0" width="6" height="40" fill="#78350f" rx="1" />
                                <rect x="-4" y="40" width="8" height="10" fill="#94a3b8" />
                                <path d="M -4 50 Q 0 65, 4 50 Z" fill="#ec4899" />
                              </g>
                            </svg>
                          </div>
                        )}

                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Asymmetric Bento Grid Features Showcase */}
            <div className="w-full flex flex-col items-center">
              <h2 className="text-3xl font-black text-slate-950 tracking-tight text-center mb-12">
                {language === "ar" ? "أدوات مذهلة، صُممت بإتقان فائق" : "Engineered with Absolute Precision"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full max-w-5xl">
                
                {/* Bento Item 1: Geometric Tools */}
                <div className="md:col-span-8 p-6 md:p-8 bg-white border border-slate-200/80 rounded-3xl shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-start relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-amber-50 to-transparent rounded-full pointer-events-none group-hover:scale-110 transition-transform" />
                  <div className="flex-1 flex flex-col gap-2 relative z-10">
                    <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center shadow-inner">
                      <Ruler size={20} />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-950 mt-2">
                      {language === "ar" ? "أدوات قياس هندسية دقيقة" : "Precise Geometric Instruments"}
                    </h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">
                      {language === "ar"
                        ? "استخدم مسطرة القياس التفاعلية، المنقلة، ومثلثات الزوايا لتسهيل شرح الهندسة والرياضيات بدقة بصرية مذهلة."
                        : "Use real interactive rulers, protractors, and set-squares to explain complex calculus and trigonometry cleanly."}
                    </p>
                  </div>
                </div>

                {/* Bento Item 2: Blogger Lightweight */}
                <div className="md:col-span-4 p-6 bg-white border border-slate-200/80 rounded-3xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between text-start relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-orange-50 to-transparent rounded-full pointer-events-none" />
                  <div className="flex-1 flex flex-col gap-2 relative z-10">
                    <div className="w-10 h-10 bg-orange-100 text-orange-700 rounded-xl flex items-center justify-center shadow-inner">
                      <FileCode size={20} />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-950 mt-2">
                      {language === "ar" ? "تضمين كامل في Blogger" : "Direct Blogger Integration"}
                    </h3>
                    <p className="text-slate-500 text-xs font-medium leading-relaxed">
                      {language === "ar"
                        ? "كود خفيف جداً مبني بـ Vanilla JS لتضمين السبورة بمرونة وسرعة تامة داخل مقالات مدونتك."
                        : "Self-contained and built with pure lightweight Vanilla JS to embed inside Blogger templates without slowing page loads."}
                    </p>
                  </div>
                </div>

                {/* Bento Item 3: Page management */}
                <div className="md:col-span-4 p-6 bg-white border border-slate-200/80 rounded-3xl shadow-xs hover:shadow-md transition-all flex flex-col justify-between text-start relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-purple-50 to-transparent rounded-full pointer-events-none" />
                  <div className="flex-1 flex flex-col gap-2 relative z-10">
                    <div className="w-10 h-10 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center shadow-inner">
                      <Layers size={20} />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-950 mt-2">
                      {language === "ar" ? "إدارة متعددة الصفحات" : "Multi-Page Workbook"}
                    </h3>
                    <p className="text-slate-500 text-xs font-medium leading-relaxed">
                      {language === "ar"
                        ? "تنظيم المحتوى التعليمي عبر حصص ومحاضرات متعددة الصفحات مع التبديل السلس والتصدير الجماعي."
                        : "Divide lectures across infinite clean board pages. Swap between them instantly and export everything into one PDF."}
                    </p>
                  </div>
                </div>

                {/* Bento Item 4: Cloud Safe Auto Save */}
                <div className="md:col-span-8 p-6 md:p-8 bg-white border border-slate-200/80 rounded-3xl shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-start relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-emerald-50 to-transparent rounded-full pointer-events-none group-hover:scale-110 transition-transform" />
                  <div className="flex-1 flex flex-col gap-2 relative z-10">
                    <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center shadow-inner">
                      <Globe size={20} />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-950 mt-2">
                      {language === "ar" ? "تزامن تلقائي وحفظ سحابي دائم" : "Seamless Real-time Cloud Backups"}
                    </h3>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">
                      {language === "ar"
                        ? "نوفا بورد تحفظ كل تعديلات الرسم أو الملاحظات تلقائياً على خوادم سحابية آمنة. عُد لتعديل درسك في أي وقت ومن أي جهاز."
                        : "Every path, shape, and note is automatically saved in real time to secure Firebase servers. Resume teaching anywhere, anytime."}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Premium Prestige Spotlight Card (الأستاذ محمد الجزار) */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="w-full max-w-4xl mx-auto rounded-3xl bg-slate-900 text-white relative overflow-hidden p-8 md:p-12 text-start border border-slate-800 shadow-2xl"
            >
              {/* Mathematics background overlay vector */}
              <div className="absolute inset-0 opacity-15 pointer-events-none font-mono text-slate-400 select-none hidden md:block text-xs p-8 leading-relaxed">
                f(x) = ∫ (3x² + 2x) dx = x³ + x² + C <br />
                sin²(θ) + cos²(θ) = 1 <br />
                e^(iπ) + 1 = 0 <br />
                Δ = b² - 4ac <br />
                V = ⁴/₃πr³
              </div>
              <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-indigo-500/20 to-transparent rounded-full blur-[100px] pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
                
                {/* Educator Profile Icon Accent */}
                <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-tr from-emerald-400 via-teal-500 to-indigo-600 p-0.5 shadow-xl shrink-0">
                  <div className="w-full h-full bg-slate-950 rounded-2xl flex flex-col items-center justify-center font-bold text-xl tracking-tight text-white relative">
                    <span className="text-[10px] uppercase font-black text-emerald-400 tracking-widest leading-none mb-1">Teacher</span>
                    <span className="text-2xl leading-none">M.G</span>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-slate-950 text-white shadow-xs">
                      <Check size={10} strokeWidth={4} />
                    </div>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-4 text-center md:text-start">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs uppercase font-black text-indigo-400 tracking-widest">
                      {language === "ar" ? "رؤية المعلم والمطور" : "Educator & Architect Spotlight"}
                    </span>
                    <h3 className="text-2xl md:text-3xl font-black text-white">
                      {language === "ar" ? "الأستاذ محمد الجزار" : "Mr. Mohamed Elgazzar"}
                    </h3>
                    <span className="text-slate-400 text-sm font-semibold">
                      {language === "ar"
                        ? "معلم خبير بمادة الرياضيات للمرحلتين الابتدائية والإعدادية بشربين"
                        : "Expert Math Teacher for Primary & Preparatory - Sherbin"}
                    </span>
                  </div>

                  <p className="text-slate-300 text-sm md:text-base font-medium leading-relaxed italic border-l-2 md:border-l-4 rtl:border-l-0 rtl:border-r-2 md:rtl:border-r-4 border-indigo-500 pl-4 pr-0 rtl:pl-0 rtl:pr-4">
                    {language === "ar"
                      ? "«التعليم ليس مجرد تلقين للمفاهيم، بل هو تجربة تفاعلية وبصرية متكاملة تجعل الطالب يرى الأبعاد الجمالية للهندسة والرياضيات. صممت نوفا بورد لتمنح كل معلم السيطرة التامة والأناقة في الشرح وبأبسط الطرق الممكنة.»"
                      : "“Education is not mere instruction; it is an immersive visual journey. NovaBoard was created to grant teachers absolute visual control and absolute simplicity, helping students grasp dimensions effortlessly.”"}
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
                    <motion.a
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      href="https://wa.me/201009617278"
                      target="_blank"
                      rel="noreferrer"
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-950/20 flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center transition-all border border-emerald-500/50"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                      </svg>
                      <span>{language === "ar" ? "تواصل مباشرة عبر واتساب" : "Chat Directly on WhatsApp"}</span>
                    </motion.a>
                  </div>

                </div>

              </div>
            </motion.div>

          </main>

          {/* Premium Clean Footer */}
          <footer className="w-full mt-20 bg-slate-900 border-t border-slate-800 py-12 relative z-10 text-slate-400 text-center text-xs font-medium">
            <div className="w-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <NovaBoardLogo size={32} showText={true} showTagline={true} lightTheme={false} language={language} />
              </div>
              <p className="text-slate-500">
                {language === "ar"
                  ? "جميع الحقوق محفوظة © ٢٠٢٦ نوفا بورد - الأستاذ محمد الجزار"
                  : "All Rights Reserved © 2026 NovaBoard - Mr. Mohamed Elgazzar"}
              </p>
              <div className="flex items-center gap-4 text-slate-500 font-bold">
                <button onClick={() => setView("privacy")} className="hover:text-indigo-400 transition-colors">
                  {language === "ar" ? "سياسة الخصوصية" : "Privacy Policy"}
                </button>
                <span>•</span>
                <button onClick={() => setView("contact")} className="hover:text-indigo-400 transition-colors">
                  {language === "ar" ? "اتصل بنا" : "Contact Us"}
                </button>
                <span>•</span>
                <a href="https://wa.me/201009617278" target="_blank" rel="noreferrer" className="hover:text-indigo-400 transition-colors">
                  WhatsApp
                </a>
              </div>
            </div>
          </footer>


        </div>
      ) : (
        <div
          className="w-full h-screen bg-[#f8fafc] text-slate-900 font-sans relative overflow-hidden flex flex-col animate-in fade-in-50 duration-500"
          dir={language === "ar" ? "rtl" : "ltr"}
          onMouseMove={handleGlobalMouseMove}
          onMouseUp={handleGlobalMouseUp}
          onTouchMove={handleGlobalMouseMove}
          onTouchEnd={handleGlobalMouseUp}
          onWheel={handleWheel}
        >
          {/* Dynamic Grid Background Overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                gridType === "dots"
                  ? "radial-gradient(#cbd5e1 1.2px, transparent 1.2px)"
                  : gridType === "grid"
                    ? "linear-gradient(#cbd5e1 0.8px, transparent 0.8px), linear-gradient(90deg, #cbd5e1 0.8px, transparent 0.8px)"
                    : gridType === "lines"
                      ? "linear-gradient(#cbd5e1 0.8px, transparent 0.8px)"
                      : "none",
              backgroundSize: `${gridSize}px ${gridSize}px`,
              backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
            }}
          />

          {/* Main SaaS Premium Header */}
          <header
            className={`relative z-20 px-3 sm:px-8 py-2 sm:py-3.5 flex flex-col md:flex-row gap-3 items-center justify-between border-b border-slate-200/80 bg-white/70 backdrop-blur-md shadow-sm transition-all duration-300 ${
              showTopBar
                ? "translate-y-0 opacity-100"
                : "-translate-y-full opacity-0 h-0 p-0 border-none overflow-hidden"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between w-full md:w-auto gap-3 sm:gap-4">
              {/* Anchor: Logo and localized App Name */}
              <div className="flex items-center gap-2.5 shrink-0">
                <NovaBoardLogo size={32} showText={false} language={language} />
                <div className="flex flex-col border-l border-slate-200 pl-3 ml-1 rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-3 rtl:ml-0 rtl:mr-1">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 leading-none">
                    {language === "ar" ? "نوفا بورد" : "NovaBoard"}
                  </span>
                  <span className="text-[9.5px] font-bold text-indigo-500 mt-1.5 hidden sm:inline-block">
                    {language === "ar"
                      ? "السبورة التفاعلية الذكية"
                      : "Premium Smartboard"}
                  </span>
                </div>
              </div>

              {/* Elegant divider */}
              <div className="hidden xs:block h-6 w-px bg-slate-200/80 mx-1"></div>

              {/* Back to Home Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setView("landing")}
                className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200/60 shadow-xs shrink-0"
                title={language === "ar" ? "الرجوع للصفحة الترحيبية" : "Go back to landing page"}
              >
                <ArrowLeft size={13} className={language === "ar" ? "rotate-180" : ""} />
                <span className="hidden xs:inline-block">{language === "ar" ? "الرئيسية" : "Home"}</span>
                <span className="xs:hidden">{language === "ar" ? "الرئيسية" : "Home"}</span>
              </motion.button>

              {/* Elegant divider */}
              <div className="hidden xs:block h-6 w-px bg-slate-200/80 mx-1"></div>

              {/* Lesson Title Input */}
              <div className="flex items-center gap-1.5 sm:gap-3">
                <input
                  type="text"
                  value={boardTitle}
                  onChange={(e) => setBoardTitle(e.target.value)}
                  placeholder={
                    language === "ar"
                      ? "اكتب عنوان الدرس هنا..."
                      : "Type lesson title..."
                  }
                  className="text-xs sm:text-sm font-semibold text-slate-700 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-200 px-1 sm:px-2 py-0.5 sm:py-1 rounded max-w-[100px] sm:max-w-[200px]"
                  title={
                    language === "ar"
                      ? "اضغط لتعديل العنوان"
                      : "Click to edit board title"
                  }
                />
                <div
                  className={`px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 ${isSaving ? "bg-amber-100 text-amber-700 border-amber-200/50" : "bg-emerald-100 text-emerald-700 border-emerald-200/50"} border`}
                >
                  {isSaving ? (
                    <RotateCw size={9} className="animate-spin" />
                  ) : (
                    <Check size={9} strokeWidth={3} />
                  )}
                  {isSaving
                    ? language === "ar"
                      ? "جاري..."
                      : "Saving..."
                    : t.saved}
                </div>
              </div>
            </div>

            {/* Header Right Interactions */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap md:flex-nowrap justify-end w-full md:w-auto">
              {/* User Auth */}
              {user ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-xs font-semibold text-slate-600 hidden lg:inline-block">
                    {user.displayName?.split(" ")[0]}
                  </span>
                  {user.photoURL && (
                    <img
                      src={user.photoURL}
                      alt="User"
                      className="w-6 h-6 sm:w-7 sm:h-7 rounded-full shadow-xs"
                    />
                  )}
                  <button
                    onClick={handleLogout}
                    className="px-2 py-0.5 sm:py-1 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 text-[10px] sm:text-xs font-bold rounded-lg transition-colors cursor-pointer border border-slate-200 hover:border-red-200"
                    title={language === "ar" ? "تسجيل الخروج" : "Log out"}
                  >
                    {language === "ar" ? "خروج" : "Logout"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className={`px-2 py-1 text-white text-[10px] sm:text-xs font-bold rounded-lg transition-colors shadow-xs flex items-center gap-1 ${
                    isLoggingIn
                      ? "bg-indigo-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                  }`}
                >
                  {isLoggingIn ? (
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Globe size={12} />
                  )}
                  {isLoggingIn
                    ? (language === "ar" ? "جاري..." : "Signing...")
                    : (language === "ar" ? "دخول" : "Sign in")}
                </button>
              )}

              <div className="w-px h-5 bg-slate-200/80 mx-0.5"></div>

              {/* Quick Help Guide Button */}
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all"
                title={t.help}
              >
                <HelpCircle size={16} />
              </button>

              {/* RTL / LTR Language Switcher */}
              <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200/80">
                <button
                  onClick={() => setLanguage("en")}
                  className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold rounded-md transition-all ${language === "en" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500"}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage("ar")}
                  className={`px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-bold rounded-md transition-all ${language === "ar" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500"}`}
                >
                  عربي
                </button>
              </div>

              <div className="w-px h-5 bg-slate-200/80 mx-0.5"></div>

              {/* Hide Top Bar Button (X) */}
              <button
                onClick={() => setShowTopBar(false)}
                className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-400 cursor-pointer transition-colors"
                title={
                  language === "ar"
                    ? "إخفاء شريط العنوان (ملء الشاشة) 🖥️"
                    : "Hide Header (Full Screen) 🖥️"
                }
              >
                <XCircle size={16} />
              </button>
            </div>
          </header>

          {/* Main Workspace */}
          <main
            ref={containerRef}
            className="relative flex-1 w-full h-full overflow-hidden select-none"
          >
            {/* Draw Canvas Element */}
            <canvas
              ref={canvasRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              className="absolute inset-0 z-10 cursor-crosshair block touch-none"
            />

            {/* Floating Interactive Sticky Notes layer on top */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              {stickyNotes.map((note) => (
                <div
                  key={note.id}
                  className={`absolute p-4 border rounded-2xl shadow-xl hover:shadow-2xl transition-shadow pointer-events-auto cursor-move select-none flex flex-col ${
                    note.color === "yellow"
                      ? "bg-amber-100 border-amber-200/70 text-amber-900 rotate-1"
                      : note.color === "blue"
                        ? "bg-sky-100 border-sky-200/70 text-sky-900 -rotate-1"
                        : note.color === "green"
                          ? "bg-emerald-100 border-emerald-200/70 text-emerald-900 rotate-2"
                          : note.color === "pink"
                            ? "bg-pink-100 border-pink-200/70 text-pink-900 -rotate-2"
                            : "bg-purple-100 border-purple-200/70 text-purple-900"
                  }`}
                  style={{
                    left: `${note.x}px`,
                    top: `${note.y}px`,
                    width: `${note.width}px`,
                    height: `${note.height}px`,
                    transformOrigin: "top left",
                  }}
                  onMouseDown={(e) => handleNoteDragStart(note.id, e)}
                  onTouchStart={(e) => handleNoteDragStart(note.id, e)}
                >
                  {/* Sticky Note Header bar */}
                  <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-black/5">
                    <span className="text-[10px] font-bold tracking-wider uppercase opacity-60">
                      {note.color === "yellow"
                        ? language === "ar"
                          ? "فكرة سريعة"
                          : "Idea Note"
                        : note.color === "blue"
                          ? language === "ar"
                            ? "قائمة مهام"
                            : "Task List"
                          : note.color === "green"
                            ? language === "ar"
                              ? "توجيهات"
                              : "Guidelines"
                            : language === "ar"
                              ? "ملاحظة لاصقة"
                              : "Sticky Note"}
                    </span>
                    <button
                      onClick={() => deleteSticky(note.id)}
                      className="w-5 h-5 rounded-full hover:bg-black/10 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      title={t.deleteNote}
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Editable Text Area */}
                  <textarea
                    value={note.text}
                    onChange={(e) => updateStickyText(note.id, e.target.value)}
                    placeholder={t.placeholderNote}
                    className="w-full flex-1 bg-transparent border-none resize-none focus:outline-none text-xs leading-relaxed font-semibold placeholder:opacity-50"
                  />

                  <div className="flex justify-end gap-1.5 pt-1">
                    {/* Note color change switcher */}
                    {(
                      ["yellow", "blue", "green", "pink", "purple"] as const
                    ).map((c) => (
                      <button
                        key={c}
                        onClick={() => {
                          setStickyNotes(
                            stickyNotes.map((n) =>
                              n.id === note.id ? { ...n, color: c } : n,
                            ),
                          );
                        }}
                        className={`w-3.5 h-3.5 rounded-full border border-black/10 transition-transform hover:scale-125 ${
                          c === "yellow"
                            ? "bg-amber-200"
                            : c === "blue"
                              ? "bg-sky-200"
                              : c === "green"
                                ? "bg-emerald-200"
                                : c === "pink"
                                  ? "bg-pink-200"
                                  : "bg-purple-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Floating Geometric Tools Layer */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              {geoTools.map((tool) => {
                const PIXELS_PER_CM = 37.8;
                if (tool.type === "ruler") {
                  const rulerLength = tool.width || 300;
                  return (
                    <div
                      key={tool.id}
                      className="absolute bg-amber-100/50 backdrop-blur-[3px] border border-amber-400/90 rounded-xl shadow-2xl pointer-events-auto cursor-grab active:cursor-grabbing select-none flex flex-col justify-between p-1 group transition-shadow hover:shadow-amber-200/20"
                      style={{
                        left: `${tool.x}px`,
                        top: `${tool.y}px`,
                        width: `${rulerLength}px`,
                        height: "80px",
                        transform: `translate(-50%, -50%) rotate(${tool.rotation}deg)`,
                        transformOrigin: "center center",
                      }}
                      onMouseDown={(e) =>
                        handleToolDragStart(tool.id, "drag", e)
                      }
                      onTouchStart={(e) =>
                        handleToolDragStart(tool.id, "drag", e)
                      }
                    >
                      {/* Ruler Markings */}
                      <div className="w-full flex h-6 justify-between px-1 relative border-b border-amber-600/40">
                        {Array.from({
                          length: Math.floor(rulerLength / 25) + 1,
                        }).map((_, i) => {
                          const xPos = i * 25;
                          return (
                            <div
                              key={i}
                              className="absolute flex flex-col items-center"
                              style={{ left: `${xPos}px` }}
                            >
                              <div className="h-3.5 w-[1.5px] bg-amber-900/80" />
                              <span className="text-[10px] font-extrabold text-amber-950 mt-0.5 font-mono leading-none">
                                {language === "ar"
                                  ? i.toLocaleString("ar-EG")
                                  : i}
                              </span>
                            </div>
                          );
                        })}
                        {Array.from({
                          length: Math.floor(rulerLength / 5) + 1,
                        }).map((_, i) => {
                          if (i % 5 === 0) return null;
                          const xPos = i * 5;
                          return (
                            <div
                              key={`mm-${i}`}
                              className="absolute bg-amber-800/60"
                              style={{
                                left: `${xPos}px`,
                                width: "1px",
                                height: "6px",
                                top: 0,
                              }}
                            />
                          );
                        })}
                      </div>

                      {/* Centered Instructions & Controls */}
                      <div className="flex flex-col items-center justify-center flex-1 py-1 px-2">
                        <span className="text-[9px] font-black text-amber-900 bg-amber-200/60 px-2 py-0.5 rounded-full mb-1">
                          {language === "ar"
                            ? "🫱 اسحب المسطرة من هنا لتحريكها"
                            : "🫱 Drag anywhere here to move"}
                        </span>
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] font-black text-amber-950/75 uppercase tracking-wider font-mono">
                            {language === "ar" ? "مسطرة قياس" : "Ruler"} (
                            {(rulerLength / PIXELS_PER_CM).toFixed(1)} cm)
                          </span>
                          <div className="flex items-center gap-1.5">
                            {/* Rotate Handle */}
                            <button
                              onMouseDown={(e) =>
                                handleToolDragStart(tool.id, "rotate", e)
                              }
                              onTouchStart={(e) =>
                                handleToolDragStart(tool.id, "rotate", e)
                              }
                              className="w-8 h-8 rounded-full bg-white border border-amber-300 flex items-center justify-center cursor-alias text-amber-800 hover:bg-amber-50 active:scale-95 shadow-md transition-all"
                              title={
                                language === "ar"
                                  ? "اسحب لتدوير المسطرة 🔄"
                                  : "Drag to Rotate 🔄"
                              }
                            >
                              <RotateCw size={14} className="animate-pulse" />
                            </button>
                            {/* Resize Handle */}
                            <button
                              onMouseDown={(e) =>
                                handleToolDragStart(tool.id, "resize", e)
                              }
                              onTouchStart={(e) =>
                                handleToolDragStart(tool.id, "resize", e)
                              }
                              className="w-8 h-8 rounded-full bg-white border border-amber-300 flex items-center justify-center cursor-ew-resize text-amber-800 hover:bg-amber-50 active:scale-95 shadow-md transition-all"
                              title={
                                language === "ar"
                                  ? "اسحب لتغيير الطول ↔️"
                                  : "Drag to Resize ↔️"
                              }
                            >
                              <ArrowLeftRight size={14} />
                            </button>
                            {/* Close Handle */}
                            <button
                              onClick={() =>
                                setGeoTools(
                                  geoTools.filter((t) => t.id !== tool.id),
                                )
                              }
                              className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center cursor-pointer border border-red-200 shadow-md transition-all"
                              title={language === "ar" ? "إزالة" : "Remove"}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (tool.type === "protractor") {
                  const pWidth = tool.width || 280;
                  return (
                    <div
                      key={tool.id}
                      className="absolute pointer-events-auto cursor-grab active:cursor-grabbing select-none flex items-center justify-center rounded-full"
                      style={{
                        left: `${tool.x}px`,
                        top: `${tool.y}px`,
                        width: `${pWidth}px`,
                        height: `${pWidth}px`,
                        transform: `translate(-50%, -50%) rotate(${tool.rotation}deg)`,
                        transformOrigin: "center center",
                      }}
                      onMouseDown={(e) =>
                        handleToolDragStart(tool.id, "drag", e)
                      }
                      onTouchStart={(e) =>
                        handleToolDragStart(tool.id, "drag", e)
                      }
                    >
                      <div className="relative w-full h-full bg-sky-50/45 backdrop-blur-[3px] border border-sky-400/60 rounded-full flex items-center justify-center overflow-hidden shadow-2xl">
                        <svg
                          className="absolute inset-0 w-full h-full"
                          viewBox="0 0 300 300"
                          width="100%"
                          height="100%"
                        >
                          {/* Outer Ring */}
                          <circle
                            cx="150"
                            cy="150"
                            r="142"
                            fill="none"
                            stroke="#0284c7"
                            strokeWidth="2.5"
                            strokeOpacity="0.8"
                          />
                          <circle
                            cx="150"
                            cy="150"
                            r="135"
                            fill="none"
                            stroke="#0284c7"
                            strokeWidth="1"
                            strokeOpacity="0.4"
                          />

                          {/* Center crosshair */}
                          <line
                            x1="110"
                            y1="150"
                            x2="190"
                            y2="150"
                            stroke="#0284c7"
                            strokeWidth="1"
                            strokeDasharray="3,3"
                            strokeOpacity="0.6"
                          />
                          <line
                            x1="150"
                            y1="110"
                            x2="150"
                            y2="190"
                            stroke="#0284c7"
                            strokeWidth="1"
                            strokeDasharray="3,3"
                            strokeOpacity="0.6"
                          />
                          <circle
                            cx="150"
                            cy="150"
                            r="8"
                            fill="none"
                            stroke="#0284c7"
                            strokeWidth="1"
                            strokeOpacity="0.6"
                          />

                          {/* Ticks & Labels */}
                          {Array.from({ length: 72 }).map((_, idx) => {
                            const angleDeg = idx * 5;
                            const angleRad = (angleDeg * Math.PI) / 180;
                            const rOuter = 142;
                            const rInner =
                              angleDeg % 30 === 0
                                ? 122
                                : angleDeg % 10 === 0
                                  ? 128
                                  : 133;
                            const x1 = 150 + rOuter * Math.cos(angleRad);
                            const y1 = 150 + rOuter * Math.sin(angleRad);
                            const x2 = 150 + rInner * Math.cos(angleRad);
                            const y2 = 150 + rInner * Math.sin(angleRad);

                            const rLabel = 108;
                            const lx = 150 + rLabel * Math.cos(angleRad);
                            const ly = 150 + rLabel * Math.sin(angleRad);

                            return (
                              <g key={idx}>
                                <line
                                  x1={x1}
                                  y1={y1}
                                  x2={x2}
                                  y2={y2}
                                  stroke="#0369a1"
                                  strokeWidth={
                                    angleDeg % 10 === 0 ? "1.5" : "1"
                                  }
                                  strokeOpacity="0.7"
                                />
                                {angleDeg % 30 === 0 && (
                                  <text
                                    x={lx}
                                    y={ly + 3.5}
                                    fill="#0369a1"
                                    fontSize="9.5"
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    transform={`rotate(${angleDeg + 90}, ${lx}, ${ly})`}
                                  >
                                    {language === "ar"
                                      ? angleDeg.toLocaleString("ar-EG")
                                      : angleDeg}
                                    °
                                  </text>
                                )}
                              </g>
                            );
                          })}
                        </svg>

                        {/* Central Controller Box (stops propagation so clicking buttons doesn't drag the tool) */}
                        <div
                          className="absolute bg-white/95 border border-sky-200/80 p-2.5 rounded-2xl shadow-xl flex flex-col items-center gap-1.5 w-[140px] z-10 pointer-events-auto select-none"
                          onMouseDown={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                        >
                          <span className="text-[10px] font-black text-sky-950 font-sans tracking-wide">
                            {language === "ar"
                              ? "منقلة ٣٦٠°"
                              : "Protractor 360°"}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {/* Rotate Button */}
                            <button
                              onMouseDown={(e) =>
                                handleToolDragStart(tool.id, "rotate", e)
                              }
                              onTouchStart={(e) =>
                                handleToolDragStart(tool.id, "rotate", e)
                              }
                              className="w-7 h-7 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center cursor-alias text-sky-700 hover:bg-sky-100 hover:text-sky-800 active:scale-95 shadow-sm transition-all"
                              title={
                                language === "ar"
                                  ? "اسحب لتدوير المنقلة 🔄"
                                  : "Drag to Rotate 🔄"
                              }
                            >
                              <RotateCw size={13} className="animate-pulse" />
                            </button>
                            {/* Resize Button */}
                            <button
                              onMouseDown={(e) =>
                                handleToolDragStart(tool.id, "resize", e)
                              }
                              onTouchStart={(e) =>
                                handleToolDragStart(tool.id, "resize", e)
                              }
                              className="w-7 h-7 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center cursor-ew-resize text-sky-700 hover:bg-sky-100 hover:text-sky-800 active:scale-95 shadow-sm transition-all"
                              title={
                                language === "ar"
                                  ? "اسحب لتغيير الحجم ↔️"
                                  : "Drag to Resize ↔️"
                              }
                            >
                              <ArrowLeftRight size={13} />
                            </button>
                            {/* Remove Button */}
                            <button
                              onClick={() =>
                                setGeoTools(
                                  geoTools.filter((t) => t.id !== tool.id),
                                )
                              }
                              className="w-7 h-7 rounded-full bg-red-50 border border-red-200 flex items-center justify-center cursor-pointer text-red-600 hover:bg-red-100 hover:text-red-700 active:scale-95 shadow-sm transition-all"
                              title={language === "ar" ? "إزالة" : "Remove"}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (tool.type === "compass") {
                  const radius = tool.radius || 100;
                  return (
                    <div
                      key={tool.id}
                      className="absolute pointer-events-auto cursor-grab active:cursor-grabbing select-none flex flex-col items-center"
                      style={{
                        left: `${tool.x}px`,
                        top: `${tool.y}px`,
                        width: "150px",
                        height: "160px",
                        transform: `translate(-50%, -85%) rotate(${tool.rotation}deg)`,
                        transformOrigin: "50% 85%",
                      }}
                      onMouseDown={(e) =>
                        handleToolDragStart(tool.id, "drag", e)
                      }
                      onTouchStart={(e) =>
                        handleToolDragStart(tool.id, "drag", e)
                      }
                    >
                      <div className="relative w-full h-full flex flex-col items-center">
                        <svg
                          className="w-full h-24 overflow-visible"
                          viewBox="0 0 120 100"
                        >
                          <line
                            x1="60"
                            y1="10"
                            x2="35"
                            y2="90"
                            stroke="#475569"
                            strokeWidth="5.5"
                            strokeLinecap="round"
                          />
                          <line
                            x1="35"
                            y1="90"
                            x2="35"
                            y2="100"
                            stroke="#94a3b8"
                            strokeWidth="2.5"
                          />
                          <line
                            x1="60"
                            y1="10"
                            x2="85"
                            y2="90"
                            stroke="#059669"
                            strokeWidth="5.5"
                            strokeLinecap="round"
                          />
                          <polygon points="85,90 90,99 80,99" fill="#10b981" />
                          <polygon points="85,94 88,99 82,99" fill="#1e293b" />
                          <circle cx="60" cy="10" r="7.5" fill="#1e293b" />
                          <circle cx="60" cy="10" r="3.5" fill="#ffffff" />
                          <path
                            d="M 35,62 A 25,25 0 0,1 85,62"
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="1.5"
                            strokeDasharray="2,2"
                          />
                        </svg>

                        <div className="bg-white/95 border border-emerald-200 p-2.5 rounded-2xl shadow-2xl flex flex-col items-center gap-1.5 w-[160px] -mt-2.5 z-10">
                          <div className="flex items-center justify-between w-full px-1">
                            <span className="text-[10px] font-black text-emerald-900">
                              {language === "ar"
                                ? "الفرجار (البرجل)"
                                : "Compass"}
                            </span>
                            <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-1 rounded">
                              {(radius / PIXELS_PER_CM).toFixed(1)} cm
                            </span>
                          </div>

                          <input
                            type="range"
                            min="40"
                            max="220"
                            value={radius}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              setGeoTools(
                                geoTools.map((t) =>
                                  t.id === tool.id ? { ...t, radius: val } : t,
                                ),
                              );
                            }}
                            className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600 focus:outline-none"
                          />

                          <div className="flex items-center gap-1.5 w-full justify-between mt-1">
                            <button
                              onClick={() => {
                                const canvas = canvasRef.current;
                                if (!canvas) return;
                                const zoomFactor = zoom / 100;
                                const cx = (tool.x - panOffset.x) / zoomFactor;
                                const cy = (tool.y - panOffset.y) / zoomFactor;
                                const adjustedRadius = radius / zoomFactor;

                                const newElement: DrawElement = {
                                  id: `el-${Date.now()}`,
                                  type: "circle",
                                  x1: cx,
                                  y1: cy,
                                  x2: cx + adjustedRadius,
                                  y2: cy,
                                  color: brushColor,
                                  width: brushWidth,
                                };

                                const newElements = [...elements, newElement];
                                setElements(newElements);
                                updateHistory(newElements);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black px-2 py-1.5 rounded-xl transition-colors cursor-pointer flex-1 text-center shadow-md"
                              title={
                                language === "ar"
                                  ? "رسم دائرة بالبرجل"
                                  : "Draw circle"
                              }
                            >
                              {language === "ar" ? "رسم دائرة" : "Draw"}
                            </button>

                            <button
                              onMouseDown={(e) =>
                                handleToolDragStart(tool.id, "rotate", e)
                              }
                              onTouchStart={(e) =>
                                handleToolDragStart(tool.id, "rotate", e)
                              }
                              className="w-8 h-8 rounded-full bg-white border border-emerald-300 flex items-center justify-center cursor-alias text-emerald-700 hover:bg-emerald-50 active:scale-95 shadow-md transition-all"
                              title={
                                language === "ar"
                                  ? "تدوير البرجل 🔄"
                                  : "Rotate 🔄"
                              }
                            >
                              <RotateCw size={12} className="animate-pulse" />
                            </button>

                            <button
                              onClick={() =>
                                setGeoTools(
                                  geoTools.filter((t) => t.id !== tool.id),
                                )
                              }
                              className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center cursor-pointer border border-red-200 shadow-md transition-all"
                              title={language === "ar" ? "إزالة" : "Remove"}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (tool.type === "setsquare") {
                  const sSize = tool.width || 180;
                  return (
                    <div
                      key={tool.id}
                      className="absolute bg-violet-100/40 backdrop-blur-[2px] border border-violet-400 shadow-2xl pointer-events-auto cursor-grab active:cursor-grabbing select-none flex items-end justify-start"
                      style={{
                        left: `${tool.x}px`,
                        top: `${tool.y}px`,
                        width: `${sSize}px`,
                        height: `${sSize}px`,
                        clipPath: "polygon(0% 100%, 100% 100%, 0% 0%)",
                        transform: `translate(-50%, -50%) rotate(${tool.rotation}deg)`,
                        transformOrigin: "center center",
                      }}
                      onMouseDown={(e) =>
                        handleToolDragStart(tool.id, "drag", e)
                      }
                      onTouchStart={(e) =>
                        handleToolDragStart(tool.id, "drag", e)
                      }
                    >
                      <div className="absolute inset-0 border-b-2 border-l-2 border-violet-500/50 pointer-events-none" />
                      <div className="absolute left-1 bottom-0 h-full w-2 flex flex-col justify-between py-1 pointer-events-none">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div
                            key={i}
                            className="h-[1px] w-2 bg-violet-800/40 relative"
                            style={{ bottom: `${i * (sSize / 9.5)}px` }}
                          />
                        ))}
                      </div>
                      <div className="absolute left-0 bottom-1 w-full h-2 flex justify-between px-1 pointer-events-none">
                        {Array.from({ length: 9 }).map((_, i) => (
                          <div
                            key={i}
                            className="w-[1px] h-2 bg-violet-800/40 relative"
                            style={{ left: `${i * (sSize / 9.5)}px` }}
                          />
                        ))}
                      </div>

                      <div
                        className="absolute bottom-3 left-3 flex flex-col items-start gap-1 bg-white/95 p-2 rounded-2xl border border-violet-100 shadow-2xl z-10 pointer-events-auto"
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                      >
                        <span className="text-[9px] font-black text-violet-950 uppercase block font-mono">
                          {language === "ar" ? "مثلث قائم" : "Set Square"} (
                          {(sSize / PIXELS_PER_CM).toFixed(1)} cm)
                        </span>
                        <div className="flex gap-1.5 mt-0.5">
                          {/* Rotate Handle */}
                          <button
                            onMouseDown={(e) =>
                              handleToolDragStart(tool.id, "rotate", e)
                            }
                            onTouchStart={(e) =>
                              handleToolDragStart(tool.id, "rotate", e)
                            }
                            className="w-8 h-8 rounded-full bg-slate-50 border border-violet-200 flex items-center justify-center cursor-alias text-violet-700 hover:bg-violet-100 active:scale-95 shadow-md"
                            title={language === "ar" ? "تدوير" : "Rotate"}
                          >
                            <RotateCw size={12} className="animate-pulse" />
                          </button>
                          {/* Resize Handle */}
                          <button
                            onMouseDown={(e) =>
                              handleToolDragStart(tool.id, "resize", e)
                            }
                            onTouchStart={(e) =>
                              handleToolDragStart(tool.id, "resize", e)
                            }
                            className="w-8 h-8 rounded-full bg-slate-50 border border-violet-200 flex items-center justify-center cursor-ew-resize text-violet-700 hover:bg-violet-100 active:scale-95 shadow-md"
                            title={
                              language === "ar"
                                ? "تغيير الطول/الحجم ↔️"
                                : "Resize ↔️"
                            }
                          >
                            <ArrowLeftRight size={12} />
                          </button>
                          {/* Remove Button */}
                          <button
                            onClick={() =>
                              setGeoTools(
                                geoTools.filter((t) => t.id !== tool.id),
                              )
                            }
                            className="w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 text-red-700 flex items-center justify-center cursor-pointer border border-red-200 shadow-md transition-all animate-none"
                            title={language === "ar" ? "إزالة" : "Remove"}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>

            {/* Text Tool input overlay */}
            {textInputPosition && (
              <form
                onSubmit={handleTextSubmit}
                className="absolute z-30"
                style={{
                  left: `${textInputPosition.x}px`,
                  top: `${textInputPosition.y}px`,
                }}
              >
                <input
                  type="text"
                  autoFocus
                  value={editingTextValue}
                  onChange={(e) => setEditingTextValue(e.target.value)}
                  onBlur={handleTextSubmit}
                  placeholder={
                    language === "ar"
                      ? "اكتب ثم اضغط Enter..."
                      : "Type then press Enter..."
                  }
                  className="px-3 py-1.5 bg-white border-2 border-indigo-500 rounded-xl shadow-lg focus:outline-none text-sm font-bold min-w-[200px]"
                />
              </form>
            )}

            {/* Restore Top Bar Button */}
            {!showTopBar && (
              <div className="absolute top-4 left-4 flex items-center gap-2 z-35">
                <button
                  onClick={() => setShowTopBar(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-3 shadow-2xl cursor-pointer hover:scale-105 transition-all flex items-center justify-center group"
                  title={
                    language === "ar" ? "إظهار شريط العنوان 🖥️" : "Show Header 🖥️"
                  }
                >
                  <ChevronDown size={18} className="animate-pulse" />
                  <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 text-[10px] font-black uppercase tracking-wider block ml-0 group-hover:ml-1.5 whitespace-nowrap">
                    {language === "ar"
                      ? "إظهار شريط العنوان"
                      : "Show Header"}
                  </span>
                </button>

                <button
                  onClick={() => setView("landing")}
                  className="bg-slate-800 hover:bg-slate-900 text-white rounded-full p-3 shadow-2xl cursor-pointer hover:scale-105 transition-all flex items-center justify-center group"
                  title={
                    language === "ar" ? "العودة للرئيسية" : "Back to Home"
                  }
                >
                  <ArrowLeft size={18} className={language === "ar" ? "rotate-180" : ""} />
                  <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 text-[10px] font-black uppercase tracking-wider block ml-0 group-hover:ml-1.5 whitespace-nowrap">
                    {language === "ar"
                      ? "الرئيسية"
                      : "Home"}
                  </span>
                </button>
              </div>
            )}

            {/* Restore Sidebar Button */}
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 md:left-4 md:-translate-x-0 md:top-1/2 md:-translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-3.5 shadow-2xl cursor-pointer hover:scale-105 transition-all z-30 flex items-center justify-center group"
                title={
                  language === "ar"
                    ? "إظهار شريط الأدوات 🛠️"
                    : "Show Sidebar 🛠️"
                }
              >
                <ChevronRight size={18} className="animate-pulse" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 text-[10px] font-black uppercase tracking-wider block ml-0 group-hover:ml-1.5 whitespace-nowrap">
                  {language === "ar" ? "الأدوات 🛠️" : "Tools 🛠️"}
                </span>
              </button>
            )}

            {/* Floating Left Tool Panel - Elegant Vertical Sidebar */}
            <div
              className={`absolute bottom-4 md:bottom-auto left-1/2 -translate-x-1/2 md:translate-x-0 md:left-6 md:top-1/2 md:-translate-y-1/2 z-30 select-none flex flex-col-reverse md:flex-row gap-2 sm:gap-4 items-center md:items-start transition-all duration-300 max-w-[95vw] md:max-w-none max-h-[85vh] flex-wrap md:flex-nowrap justify-center pb-2 sm:pb-0 ${
                showSidebar
                  ? "translate-y-0 opacity-100"
                  : "translate-y-24 md:-translate-x-96 md:translate-y-0 opacity-0 pointer-events-none"
              }`}
              dir="ltr"
            >
              {/* Primary Toolbar */}
              <nav className="flex flex-row md:flex-col gap-1.5 sm:gap-2 p-1.5 sm:p-2 bg-white border border-slate-200/80 shadow-[0_12px_40px_rgba(0,0,0,0.08)] rounded-2xl sm:rounded-[32px] w-auto md:w-[56px] items-center justify-center flex-wrap md:flex-nowrap shrink-0">
                {/* Cursor Selection */}
                <button
                  onClick={() => {
                    setActiveTool("select");
                    setOpenShapesPanel(null);
                  }}
                  className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-2xl transition-all cursor-pointer ${activeTool === "select" ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-100" : "text-slate-500 hover:bg-slate-50"}`}
                  title={language === "ar" ? "أداة التحديد" : "Selection Tool"}
                >
                  <MousePointer size={18} className="sm:w-5 sm:h-5" />
                </button>

                {/* Hand Pan Tool */}
                <button
                  onClick={() => {
                    setActiveTool("pan");
                    setOpenShapesPanel(null);
                  }}
                  className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-2xl transition-all cursor-pointer ${activeTool === "pan" ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-100" : "text-slate-500 hover:bg-slate-50"}`}
                  title={language === "ar" ? "أداة التحريك" : "Pan Board"}
                >
                  <Hand size={18} className="sm:w-5 sm:h-5" />
                </button>

                <div className="w-px h-6 md:w-8 md:h-px bg-slate-200 my-0 mx-0.5 md:mx-0 md:my-0.5 shrink-0" />

                {/* Freehand Pencil (yellow marker body style) */}
                <button
                  onClick={() => {
                    if (activeTool === "pen") {
                      setShowPenSettings(!showPenSettings);
                    } else {
                      setActiveTool("pen");
                      setShowPenSettings(true);
                    }
                    setOpenShapesPanel(null);
                  }}
                  className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-2xl transition-all cursor-pointer relative ${activeTool === "pen" ? "bg-amber-50 text-amber-600 shadow-sm border border-amber-100 ring-2 ring-amber-200/50" : "text-slate-500 hover:bg-slate-50"}`}
                  title={
                    language === "ar"
                      ? "القلم الحر • اضغط مرتين لفتح الإعدادات"
                      : "Freehand Pen • Double click for settings"
                  }
                >
                  <PenTool size={18} className="sm:w-5 sm:h-5" />
                  <div className="absolute bottom-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500" />
                </button>

                {/* Eraser */}
                <button
                  onClick={() => {
                    if (activeTool === "eraser") {
                      setShowEraserSettings(!showEraserSettings);
                    } else {
                      setActiveTool("eraser");
                      setShowEraserSettings(true);
                    }
                    setOpenShapesPanel(null);
                  }}
                  className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-2xl transition-all cursor-pointer relative ${activeTool === "eraser" ? "bg-slate-100 text-slate-800 shadow-sm border border-slate-200 ring-2 ring-slate-300/30" : "text-slate-500 hover:bg-slate-50"}`}
                  title={
                    language === "ar"
                      ? "الممحاة الذكية • اضغط مرتين لفتح الإعدادات"
                      : "Eraser Tool • Double click for settings"
                  }
                >
                  <Eraser size={18} className="sm:w-5 sm:h-5" />
                </button>

                {/* 3D-styled Geometric Shapes Menu button */}
                <button
                  onClick={() => {
                    setShowShapesSubmenu(!showShapesSubmenu);
                    // Switch active tool to shape rect if not drawing shapes
                    if (
                      ![
                        "rect",
                        "circle",
                        "triangle",
                        "line",
                        "arrow",
                        "cube",
                        "sphere",
                        "cylinder",
                        "cone",
                        "pyramid",
                        "prism",
                        "torus",
                        "tetrahedron",
                      ].includes(activeTool)
                    ) {
                      setActiveTool("rect");
                    }
                  }}
                  className={`w-9 h-9 sm:w-11 sm:h-11 flex flex-col items-center justify-center rounded-lg sm:rounded-2xl transition-all cursor-pointer relative ${
                    showShapesSubmenu
                      ? "bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-[0_3px_0_0_#312e81] sm:shadow-[0_4px_0_0_#312e81] border-t border-indigo-400 translate-y-[-2px] active:translate-y-[2px] active:shadow-none font-sans"
                      : "bg-white text-slate-600 border border-slate-200 shadow-[0_2px_0_0_#cbd5e1] sm:shadow-[0_3px_0_0_#cbd5e1] hover:bg-slate-50 active:translate-y-[2px] active:shadow-none font-sans"
                  }`}
                  title={
                    language === "ar"
                      ? "الأشكال والأدوات الهندسية ثلاثية الأبعاد"
                      : "Geometric Shapes & 3D Menu"
                  }
                >
                  <Box
                    size={18}
                    className={
                      showShapesSubmenu
                        ? "text-white drop-shadow-sm sm:w-5 sm:h-5"
                        : "text-indigo-600 sm:w-5 sm:h-5"
                    }
                  />
                  <div className="absolute -bottom-1 -right-1 bg-amber-500 text-[7px] sm:text-[8px] text-white font-black px-1 rounded-full scale-90 border border-white">
                    3D
                  </div>
                </button>

                {/* Add Text */}
                <button
                  onClick={() => {
                    setActiveTool("text");
                    setOpenShapesPanel(null);
                  }}
                  className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-2xl transition-all cursor-pointer ${activeTool === "text" ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-100" : "text-slate-500 hover:bg-slate-50"}`}
                  title={language === "ar" ? "إضافة نص" : "Add Text"}
                >
                  <Type size={18} className="sm:w-5 sm:h-5" />
                </button>

                {/* Add Sticky Note (Yellow origami folded style) */}
                <button
                  onClick={handleAddSticky}
                  className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-2xl text-amber-500 hover:bg-amber-50 hover:text-amber-600 transition-all cursor-pointer relative"
                  title={language === "ar" ? "ملاحظة لاصقة" : "Add Sticky Note"}
                >
                  <StickyIcon size={18} className="fill-amber-50 sm:w-5 sm:h-5" />
                </button>

                <div className="w-px h-6 md:w-8 md:h-px bg-slate-200 my-0 mx-0.5 md:mx-0 md:my-0.5 shrink-0" />

                <div className="relative">
                  <button
                    onClick={() => {
                      setShowExportPopover(!showExportPopover);
                      setShowFolderPopover(false);
                      setShowMagicPopover(false);
                      setShowAppsPopover(false);
                    }}
                    className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-2xl transition-all cursor-pointer ${showExportPopover ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "text-slate-500 hover:bg-slate-50"}`}
                    title={
                      language === "ar" ? "تصدير السبورة" : "Export Whiteboard"
                    }
                  >
                    <Download size={18} className="sm:w-5 sm:h-5" />
                  </button>
                </div>

                {/* Magic box widgets (ruler, protractor, math graph) */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowMagicPopover(!showMagicPopover);
                      setShowFolderPopover(false);
                      setShowAppsPopover(false);
                    }}
                    className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-2xl transition-all cursor-pointer ${showMagicPopover ? "bg-purple-50 text-purple-600 border border-purple-100" : "text-slate-500 hover:bg-slate-50"}`}
                    title={
                      language === "ar"
                        ? "صندوق الأدوات السحري"
                        : "Magic Tool Box"
                    }
                  >
                    <Wand2 size={18} className="sm:w-5 sm:h-5" />
                  </button>
                </div>

                {/* Web Browser simulation (Now fully interactive) */}
                <button
                  onClick={() => {
                    setShowBrowserHelper(!showBrowserHelper);
                  }}
                  className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-2xl transition-all cursor-pointer ${showBrowserHelper ? "bg-sky-50 text-sky-600 border border-sky-100 ring-2 ring-sky-200/50" : "text-slate-500 hover:bg-slate-50"}`}
                  title={
                    language === "ar"
                      ? "مستعرض الويب المساعد والآلة الحاسبة"
                      : "Web Resource Browser & Calculator"
                  }
                >
                  <Globe size={18} className="sm:w-5 sm:h-5" />
                </button>

                <div className="w-px h-6 md:w-8 md:h-px bg-slate-200 my-0 mx-0.5 md:mx-0 md:my-0.5 shrink-0" />

                {/* Undo */}
                <button
                  onClick={handleUndo}
                  disabled={historyIndex <= 0}
                  className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-2xl transition-all cursor-pointer ${historyIndex > 0 ? "text-slate-600 hover:bg-slate-50" : "text-slate-300 cursor-not-allowed"}`}
                  title={language === "ar" ? "تراجع" : "Undo"}
                >
                  <Undo2 size={16} className="sm:w-4 sm:h-4" />
                </button>

                {/* Redo */}
                <button
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                  className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-2xl transition-all cursor-pointer ${historyIndex < history.length - 1 ? "text-slate-600 hover:bg-slate-50" : "text-slate-300 cursor-not-allowed"}`}
                  title={language === "ar" ? "إعادة" : "Redo"}
                >
                  <Redo2 size={16} className="sm:w-4 sm:h-4" />
                </button>

                <div className="w-px h-6 md:w-8 md:h-px bg-slate-200 my-0 mx-0.5 md:mx-0 md:my-0.5 shrink-0" />

                {/* Hide Sidebar Button */}
                <button
                  onClick={() => setShowSidebar(false)}
                  className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg sm:rounded-2xl text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all cursor-pointer shrink-0"
                  title={
                    language === "ar" ? "إخفاء شريط الأدوات" : "Hide Toolbar"
                  }
                >
                  <XCircle size={18} className="sm:w-5 sm:h-5" />
                </button>
              </nav>

              {/* Pen Settings Submenu - Appears next to sidebar if pen active */}
              {activeTool === "pen" && showPenSettings && (
                <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl p-4 shadow-2xl flex flex-col gap-3.5 w-48 animate-in slide-in-from-left-4 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-indigo-950">
                      {language === "ar" ? "إعدادات القلم" : "Pen Settings"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold font-mono">
                        {brushWidth}px
                      </span>
                      <button
                        onClick={() => setShowPenSettings(false)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        title={language === "ar" ? "إغلاق" : "Close"}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Colors */}
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">
                      {language === "ar" ? "اختر لون القلم" : "Pen Color"}
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      {colorPresets.map((c) => (
                        <button
                          key={c.value}
                          onClick={() => setBrushColor(c.value)}
                          className={`w-8 h-8 rounded-full border transition-all cursor-pointer relative ${brushColor === c.value ? "scale-110 ring-2 ring-indigo-200 border-white" : "border-slate-200 hover:scale-105"}`}
                          style={{ backgroundColor: c.value }}
                          title={c.label}
                        >
                          {brushColor === c.value && (
                            <div className="absolute inset-0 flex items-center justify-center text-white">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          )}
                        </button>
                      ))}

                      {/* Custom color wheel selector */}
                      <div
                        className={`relative flex items-center justify-center w-8 h-8 rounded-full border transition-all cursor-pointer bg-[conic-gradient(from_0deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff,#ff0000)] ${
                          !colorPresets.some((p) => p.value === brushColor)
                            ? "scale-110 ring-2 ring-indigo-200 border-white"
                            : "border-slate-200 hover:scale-105"
                        }`}
                        title={
                          language === "ar" ? "لون مخصص 🎨" : "Custom Color 🎨"
                        }
                      >
                        <input
                          type="color"
                          value={brushColor}
                          onChange={(e) => setBrushColor(e.target.value)}
                          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                        />
                        {!colorPresets.some((p) => p.value === brushColor) ? (
                          <div className="absolute inset-0 flex items-center justify-center text-white drop-shadow-md">
                            <Check size={12} strokeWidth={3} />
                          </div>
                        ) : (
                          <span className="text-[12px] text-white font-black drop-shadow-md pointer-events-none">
                            +
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100"></div>

                  {/* Draggable Thickness range slider */}
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">
                      {language === "ar" ? "سمك الخط" : "Line Thickness"}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      <input
                        type="range"
                        min="1"
                        max="40"
                        value={brushWidth}
                        onChange={(e) => setBrushWidth(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <div className="flex justify-between text-[9px] font-extrabold text-slate-400">
                        <span>{language === "ar" ? "رقيق" : "Thin"}</span>
                        <span>{language === "ar" ? "عريض" : "Thick"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Eraser Settings Submenu - Appears next to sidebar if eraser active */}
              {activeTool === "eraser" && showEraserSettings && (
                <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-3xl p-4 shadow-2xl flex flex-col gap-3.5 w-48 animate-in slide-in-from-left-4 duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">
                      {language === "ar"
                        ? "إعدادات الممحاة"
                        : "Eraser Settings"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setShowEraserSettings(false)}
                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        title={language === "ar" ? "إغلاق" : "Close"}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Eraser Size Slider */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>
                        {language === "ar" ? "حجم الممحاة" : "Eraser Size"}
                      </span>
                      <span className="font-mono text-indigo-600">
                        {eraserSize}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="120"
                      value={eraserSize}
                      onChange={(e) => setEraserSize(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>

                  <div className="h-px bg-slate-100"></div>

                  {/* Erase Degree/Opacity Slider */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>
                        {language === "ar" ? "درجة المسح" : "Erase Degree"}
                      </span>
                      <span className="font-mono text-indigo-600">
                        {eraserOpacity}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      value={eraserOpacity}
                      onChange={(e) => setEraserOpacity(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                  </div>
                </div>
              )}

              {/* Secondary Shapes Submenu - Appears next to primary menu if shapes active */}
              {showShapesSubmenu && (
                <nav className="flex flex-row md:flex-col gap-2 p-2 bg-white border border-slate-200/80 shadow-[0_12px_40px_rgba(0,0,0,0.08)] rounded-2xl md:rounded-[32px] w-auto md:w-[52px] h-auto items-center justify-center animate-in slide-in-from-bottom md:slide-in-from-left duration-200 flex-wrap md:flex-nowrap shrink-0">
                  {/* Rectangle shape */}
                  <button
                    onClick={() => {
                      setActiveTool("rect");
                      setOpenShapesPanel(null);
                    }}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer shrink-0 ${activeTool === "rect" ? "bg-indigo-50 text-indigo-600 shadow-inner border border-indigo-100" : "text-slate-500 hover:bg-slate-50"}`}
                    title={language === "ar" ? "مستطيل" : "Rectangle"}
                  >
                    <Square size={18} />
                  </button>

                  {/* Circle shape */}
                  <button
                    onClick={() => {
                      setActiveTool("circle");
                      setOpenShapesPanel(null);
                    }}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer shrink-0 ${activeTool === "circle" ? "bg-indigo-50 text-indigo-600 shadow-inner border border-indigo-100" : "text-slate-500 hover:bg-slate-50"}`}
                    title={language === "ar" ? "دائرة" : "Circle"}
                  >
                    <CircleIcon size={18} />
                  </button>

                  {/* Triangle shape */}
                  <button
                    onClick={() => {
                      setActiveTool("triangle");
                      setOpenShapesPanel(null);
                    }}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer shrink-0 ${activeTool === "triangle" ? "bg-indigo-50 text-indigo-600 shadow-inner border border-indigo-100" : "text-slate-500 hover:bg-slate-50"}`}
                    title={language === "ar" ? "مثلث" : "Triangle"}
                  >
                    <Layers size={18} className="rotate-45 text-slate-400" />
                  </button>

                  <div className="w-px h-7 md:w-7 md:h-px bg-slate-100 my-0 mx-1 md:mx-0 md:my-0.5 shrink-0" />

                  {/* 2D shapes list toggle (overlapping shapes on blue background exactly like photo) */}
                  <button
                    onClick={() => {
                      setOpenShapesPanel(
                        openShapesPanel === "2d" ? null : "2d",
                      );
                    }}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer shrink-0 ${openShapesPanel === "2d" || ["triangle", "right_triangle", "star", "pentagon", "hexagon", "ellipse", "rhombus", "parallelogram", "trapezoid", "heart", "crescent", "cross"].includes(activeTool) ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
                    title={
                      language === "ar"
                        ? "أشكال ثنائية الأبعاد إضافية"
                        : "More 2D Shapes"
                    }
                  >
                    <Layers size={18} />
                  </button>

                  {/* Vector line tool */}
                  <button
                    onClick={() => {
                      setActiveTool("line");
                      setOpenShapesPanel(null);
                    }}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer shrink-0 ${activeTool === "line" ? "bg-indigo-50 text-indigo-600 shadow-inner border border-indigo-100" : "text-slate-500 hover:bg-slate-50"}`}
                    title={language === "ar" ? "خط مستقيم" : "Straight Line"}
                  >
                    <Minus size={18} />
                  </button>

                  {/* Arrow tool */}
                  <button
                    onClick={() => {
                      setActiveTool("arrow");
                      setOpenShapesPanel(null);
                    }}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer shrink-0 ${activeTool === "arrow" ? "bg-indigo-50 text-indigo-600 shadow-inner border border-indigo-100" : "text-slate-500 hover:bg-slate-50"}`}
                    title={language === "ar" ? "سهم متجه" : "Vector Arrow"}
                  >
                    <ArrowUpRight size={18} />
                  </button>

                  {/* 3D Wireframe Cube icon */}
                  <button
                    onClick={() => {
                      setOpenShapesPanel(
                        openShapesPanel === "3d" ? null : "3d",
                      );
                    }}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer shrink-0 ${openShapesPanel === "3d" || ["cube", "sphere", "cylinder", "cone", "pyramid", "prism", "torus", "tetrahedron"].includes(activeTool) ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"}`}
                    title={
                      language === "ar"
                        ? "أشكال مجسمة ثلاثية الأبعاد"
                        : "3D Shapes Projections"
                    }
                  >
                    <Box size={18} />
                  </button>

                  {/* Table/Grid insert */}
                  <button
                    onClick={() => {
                      setGridType(gridType === "grid" ? "none" : "grid");
                      alert(
                        language === "ar"
                          ? "تم تفعيل شبكة المربعات الرياضية للرسم البياني!"
                          : "Coordinate math square grids activated!",
                      );
                    }}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all cursor-pointer shrink-0 ${gridType === "grid" ? "bg-sky-50 text-sky-600 border border-sky-100" : "text-slate-500 hover:bg-slate-50"}`}
                    title={
                      language === "ar"
                        ? "إضافة جدول أو شبكة بيانية"
                        : "Add Cartesian Table Grid"
                    }
                  >
                    <Table size={18} />
                  </button>

                  <div className="w-px h-7 md:w-7 md:h-px bg-slate-100 my-0 mx-1 md:mx-0 md:my-0.5 shrink-0" />

                  {/* Collapse Submenu */}
                  <button
                    onClick={() => setShowShapesSubmenu(false)}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all cursor-pointer shrink-0"
                    title={language === "ar" ? "إغلاق القائمة" : "Close Menu"}
                  >
                    <ChevronUp size={16} className="rotate-90 md:rotate-0" />
                  </button>
                </nav>
              )}

              {/* Popover panel for ALL 2D Shapes */}
              {openShapesPanel === "2d" && (
                <div className="absolute bottom-[calc(100%+1rem)] md:bottom-auto left-1/2 -translate-x-1/2 md:-translate-x-0 md:left-[144px] top-auto md:top-1/2 md:-translate-y-1/2 bg-white border border-slate-200 shadow-2xl p-4 rounded-3xl w-72 z-40 animate-in zoom-in-95 duration-150">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      {language === "ar"
                        ? "الأشكال ثنائية الأبعاد"
                        : "2D Shapes List"}
                    </h4>
                    <button
                      onClick={() => setOpenShapesPanel(null)}
                      className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                    >
                      ×
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {[
                      {
                        key: "rect",
                        labelAr: "مستطيل",
                        labelEn: "Rectangle",
                        icon: "▭",
                      },
                      {
                        key: "circle",
                        labelAr: "دائرة",
                        labelEn: "Circle",
                        icon: "◯",
                      },
                      {
                        key: "triangle",
                        labelAr: "مثلث الساقين",
                        labelEn: "Triangle",
                        icon: "▲",
                      },
                      {
                        key: "right_triangle",
                        labelAr: "قائم الزاوية",
                        labelEn: "Right Tri",
                        icon: "⊿",
                      },
                      {
                        key: "ellipse",
                        labelAr: "بيضاوي",
                        labelEn: "Ellipse",
                        icon: "⬭",
                      },
                      {
                        key: "star",
                        labelAr: "خماسية",
                        labelEn: "Star",
                        icon: "⭐",
                      },
                      {
                        key: "pentagon",
                        labelAr: "مخمس",
                        labelEn: "Pentagon",
                        icon: "⬠",
                      },
                      {
                        key: "hexagon",
                        labelAr: "مسدس",
                        labelEn: "Hexagon",
                        icon: "⬡",
                      },
                      {
                        key: "rhombus",
                        labelAr: "معين",
                        labelEn: "Rhombus",
                        icon: "♦",
                      },
                      {
                        key: "parallelogram",
                        labelAr: "متوازي أضلاع",
                        labelEn: "Parallelogram",
                        icon: "▱",
                      },
                      {
                        key: "trapezoid",
                        labelAr: "شبه منحرف",
                        labelEn: "Trapezoid",
                        icon: "⏢",
                      },
                      {
                        key: "heart",
                        labelAr: "قلب",
                        labelEn: "Heart",
                        icon: "❤️",
                      },
                      {
                        key: "crescent",
                        labelAr: "هلال",
                        labelEn: "Crescent",
                        icon: "🌙",
                      },
                      {
                        key: "cross",
                        labelAr: "علامة زائد",
                        labelEn: "Cross",
                        icon: "➕",
                      },
                    ].map((sh) => (
                      <button
                        key={sh.key}
                        onClick={() => {
                          setActiveTool(sh.key);
                          setOpenShapesPanel(null);
                        }}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${activeTool === sh.key ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600"}`}
                      >
                        <span className="text-lg mb-1">{sh.icon}</span>
                        <span className="text-[10px] font-semibold leading-tight line-clamp-1">
                          {language === "ar" ? sh.labelAr : sh.labelEn}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popover panel for ALL 3D Shapes */}
              {openShapesPanel === "3d" && (
                <div className="absolute bottom-[calc(100%+1rem)] md:bottom-auto left-1/2 -translate-x-1/2 md:-translate-x-0 md:left-[144px] top-auto md:top-1/2 md:-translate-y-1/2 bg-white border border-slate-200 shadow-2xl p-4 rounded-3xl w-72 z-40 animate-in zoom-in-95 duration-150">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      {language === "ar"
                        ? "المجسمات ثلاثية الأبعاد"
                        : "3D Wireframes"}
                    </h4>
                    <button
                      onClick={() => setOpenShapesPanel(null)}
                      className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                    >
                      ×
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                    {[
                      {
                        key: "cube",
                        labelAr: "مكعب",
                        labelEn: "Cube",
                        icon: "🧊",
                      },
                      {
                        key: "sphere",
                        labelAr: "كرة مجسمة",
                        labelEn: "Sphere",
                        icon: "🔮",
                      },
                      {
                        key: "cylinder",
                        labelAr: "أسطوانة",
                        labelEn: "Cylinder",
                        icon: "🥫",
                      },
                      {
                        key: "cone",
                        labelAr: "مخروط",
                        labelEn: "Cone",
                        icon: "🍦",
                      },
                      {
                        key: "pyramid",
                        labelAr: "هرم رباعي",
                        labelEn: "Pyramid",
                        icon: "🔺",
                      },
                      {
                        key: "prism",
                        labelAr: "منشور ثلاثي",
                        labelEn: "Tri Prism",
                        icon: "📐",
                      },
                      {
                        key: "torus",
                        labelAr: "حلقة دونات",
                        labelEn: "Torus",
                        icon: "🍩",
                      },
                      {
                        key: "tetrahedron",
                        labelAr: "رباعي الأوجه",
                        labelEn: "Tetrahedron",
                        icon: "💎",
                      },
                    ].map((sh) => (
                      <button
                        key={sh.key}
                        onClick={() => {
                          setActiveTool(sh.key);
                          setOpenShapesPanel(null);
                        }}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${activeTool === sh.key ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600"}`}
                      >
                        <span className="text-2xl mb-1">{sh.icon}</span>
                        <span className="text-xs font-bold leading-tight">
                          {language === "ar" ? sh.labelAr : sh.labelEn}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Popover panel for Export */}
              {showExportPopover && (
                <div className="absolute bottom-[calc(100%+1rem)] md:bottom-auto left-1/2 -translate-x-1/2 md:-translate-x-0 md:left-[70px] top-auto md:top-[140px] bg-white border border-slate-200 shadow-2xl p-4 rounded-3xl w-56 z-40 animate-in zoom-in-95 duration-150">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800">
                      {language === "ar"
                        ? "تصدير السبورة"
                        : "Export Whiteboard"}
                    </h4>
                    <button
                      onClick={() => setShowExportPopover(false)}
                      className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        exportAllPagesAsPDF();
                        setShowExportPopover(false);
                      }}
                      className="w-full px-3 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors border border-emerald-200"
                    >
                      <Layers size={14} />
                      {language === "ar" ? "تصدير PDF للدرس" : "Export PDF"}
                    </button>
                    <button
                      onClick={() => {
                        handleDownload();
                        setShowExportPopover(false);
                      }}
                      className="w-full px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors border border-indigo-200"
                    >
                      <Download size={14} />
                      {t.downloadPng}
                    </button>
                  </div>
                </div>
              )}

              {/* Popover panel for Magic Tools */}
              {showMagicPopover && (
                <div className="absolute bottom-[calc(100%+1rem)] md:bottom-auto left-1/2 -translate-x-1/2 md:-translate-x-0 md:left-[70px] top-auto md:top-[230px] bg-white border border-slate-200 shadow-2xl p-4 rounded-3xl w-60 z-40 animate-in zoom-in-95 duration-150">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800">
                      {language === "ar"
                        ? "صندوق الأدوات السحري"
                        : "Magic Box Tools"}
                    </h4>
                    <button
                      onClick={() => setShowMagicPopover(false)}
                      className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2 leading-relaxed">
                    {language === "ar"
                      ? "أدوات هندسية ورسم تفاعلي للمعلم لتمثيل الأشكال الرياضية بدقة"
                      : "Interactive mathematical widgets to present geometric details beautifully."}
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => {
                        setGridType(gridType === "grid" ? "none" : "grid");
                        setShowMagicPopover(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2"
                    >
                      📊{" "}
                      {language === "ar"
                        ? gridType === "grid"
                          ? "إخفاء شبكة المربعات"
                          : "تفعيل شبكة الإحداثيات"
                        : gridType === "grid"
                          ? "Hide Grid"
                          : "Activate Grid"}
                    </button>
                    <button
                      onClick={() => {
                        const id = `tool-${Date.now()}`;
                        setGeoTools([
                          ...geoTools,
                          {
                            id,
                            type: "ruler",
                            x: 400 + Math.random() * 100,
                            y: 300 + Math.random() * 100,
                            rotation: 0,
                            width: 300,
                          },
                        ]);
                        setShowMagicPopover(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2"
                    >
                      📏{" "}
                      {language === "ar"
                        ? "إدراج مسطرة هندسية"
                        : "Insert Geometric Ruler"}
                    </button>
                    <button
                      onClick={() => {
                        const id = `tool-${Date.now()}`;
                        setGeoTools([
                          ...geoTools,
                          {
                            id,
                            type: "protractor",
                            x: 450 + Math.random() * 100,
                            y: 350 + Math.random() * 100,
                            rotation: 0,
                          },
                        ]);
                        setShowMagicPopover(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2"
                    >
                      📐{" "}
                      {language === "ar"
                        ? "إدراج منقلة زوايا"
                        : "Insert Protractor"}
                    </button>
                    <button
                      onClick={() => {
                        const id = `tool-${Date.now()}`;
                        setGeoTools([
                          ...geoTools,
                          {
                            id,
                            type: "compass",
                            x: 500 + Math.random() * 100,
                            y: 320 + Math.random() * 100,
                            rotation: 0,
                            radius: 100,
                          },
                        ]);
                        setShowMagicPopover(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2"
                    >
                      🧭{" "}
                      {language === "ar"
                        ? "إدراج الفرجار (البرجل)"
                        : "Insert Compass"}
                    </button>
                    <button
                      onClick={() => {
                        const id = `tool-${Date.now()}`;
                        setGeoTools([
                          ...geoTools,
                          {
                            id,
                            type: "setsquare",
                            x: 420 + Math.random() * 100,
                            y: 280 + Math.random() * 100,
                            rotation: 0,
                          },
                        ]);
                        setShowMagicPopover(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-2"
                    >
                      📐{" "}
                      {language === "ar"
                        ? "إدراج مثلث قائم الزاوية"
                        : "Insert Set Square"}
                    </button>
                  </div>
                </div>
              )}

              {/* Popover panel for App Layout Grids */}
              {showAppsPopover && (
                <div className="absolute bottom-[calc(100%+1rem)] md:bottom-auto left-1/2 -translate-x-1/2 md:-translate-x-0 md:left-[70px] top-auto md:top-[320px] bg-white border border-slate-200 shadow-2xl p-4 rounded-3xl w-56 z-40 animate-in zoom-in-95 duration-150">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800">
                      {language === "ar"
                        ? "تنسيق شبكة السبورة"
                        : "Whiteboard Grid Layout"}
                    </h4>
                    <button
                      onClick={() => setShowAppsPopover(false)}
                      className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {[
                      {
                        key: "none",
                        labelAr: "بدون شبكة (سادة)",
                        labelEn: "Plain Canvas",
                      },
                      {
                        key: "dots",
                        labelAr: "شبكة نقاط ذكية",
                        labelEn: "Fine Dot Grid",
                      },
                      {
                        key: "grid",
                        labelAr: "شبكة مربعات هندسية",
                        labelEn: "Square Graph Grid",
                      },
                    ].map((g) => (
                      <button
                        key={g.key}
                        onClick={() => {
                          setGridType(g.key as any);
                          setShowAppsPopover(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl transition-colors flex items-center justify-between ${gridType === g.key ? "bg-indigo-50 text-indigo-600 font-bold" : "text-slate-600 hover:bg-slate-50"}`}
                      >
                        <span>{language === "ar" ? g.labelAr : g.labelEn}</span>
                        {gridType === g.key && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Help & Guide overlay on board */}
            {showHelp && (
              <div className="absolute top-16 md:top-6 left-4 md:left-28 p-5 bg-white border border-slate-200/80 shadow-2xl rounded-2xl w-[calc(100%-2rem)] md:w-80 z-30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Info size={14} className="text-indigo-500" />
                    {t.help}
                  </span>
                  <button
                    onClick={() => setShowHelp(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  {t.helpDesc}
                </p>
              </div>
            )}

            {/* Interactive Web Assistant & Educational Helper */}
            {showBrowserHelper && (
              <div className="absolute top-16 md:top-6 right-4 md:right-6 bottom-28 md:bottom-24 w-[calc(100%-2rem)] md:w-96 bg-white/95 backdrop-blur-md border border-slate-200 shadow-2xl rounded-3xl z-40 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-4 bg-gradient-to-r from-sky-500 to-indigo-600 text-white flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Globe size={18} className="animate-spin-slow text-white" />
                    <span className="font-bold text-sm">
                      {language === "ar"
                        ? "مستعرض مصادر التعليم والرياضيات"
                        : "Edu-Web & Math Resource Hub"}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowBrowserHelper(false)}
                    className="hover:bg-white/15 p-1.5 rounded-lg transition-colors text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Inner Content - Tabs and Interactive Widgets */}
                <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                  {/* Search Widget */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">
                      {language === "ar"
                        ? "بحث تفاعلي سريع"
                        : "Quick Wiki-Math Search"}
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder={
                          language === "ar"
                            ? "اكتب مثلاً: فيثاغورس، الدائرة..."
                            : "Search: Circle, Pythagoras..."
                        }
                        className="flex-1 bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                        id="edu-search-input"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = (e.target as HTMLInputElement).value;
                            alert(
                              language === "ar"
                                ? `نتائج البحث عن "${val}" متوفرة أدناه في ملخص القوانين!`
                                : `Search results for "${val}" are available in the summary guide below!`,
                            );
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const val =
                            (
                              document.getElementById(
                                "edu-search-input",
                              ) as HTMLInputElement
                            )?.value || "";
                          alert(
                            language === "ar"
                              ? `نتائج البحث عن "${val}" متوفرة أدناه في ملخص القوانين!`
                              : `Search results for "${val}" are available in the summary guide below!`,
                          );
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                      >
                        {language === "ar" ? "بحث" : "Search"}
                      </button>
                    </div>
                  </div>

                  {/* Math Interactive Calculator Widget */}
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/50 rounded-2xl p-4">
                    <span className="text-[10px] font-black uppercase text-indigo-500 block mb-2 tracking-wider">
                      {language === "ar"
                        ? "الآلة الحاسبة العلمية الذكية"
                        : "Smart Educational Calculator"}
                    </span>
                    <div className="flex flex-col gap-2.5">
                      <input
                        type="text"
                        id="calc-expression"
                        placeholder="e.g. 5 * 5 * 3.14159"
                        defaultValue="5 * 5 * 3.14159"
                        className="bg-white border border-indigo-200/60 px-3.5 py-2 rounded-xl text-xs font-mono font-bold text-indigo-900 focus:outline-none focus:border-indigo-500 shadow-inner"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const exprInput = document.getElementById(
                              "calc-expression",
                            ) as HTMLInputElement;
                            const expr = exprInput ? exprInput.value : "";
                            try {
                              // Replace standard math functions
                              const safeExpr = expr
                                .replace(/sin\(/g, "Math.sin(Math.PI/180*")
                                .replace(/cos\(/g, "Math.cos(Math.PI/180*")
                                .replace(/tan\(/g, "Math.tan(Math.PI/180*")
                                .replace(/sqrt\(/g, "Math.sqrt(")
                                .replace(/pow\(/g, "Math.pow(")
                                .replace(/pi/gi, "Math.PI");
                              const res = new Function(`return ${safeExpr}`)();
                              const resEl =
                                document.getElementById("calc-result");
                              if (resEl)
                                resEl.innerText = `${Number(res).toFixed(5)}`;
                            } catch (err) {
                              const resEl =
                                document.getElementById("calc-result");
                              if (resEl)
                                resEl.innerText =
                                  language === "ar"
                                    ? "خطأ في التعبير"
                                    : "Expression Error";
                            }
                          }}
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer"
                        >
                          {language === "ar" ? "احسب النتيجة" : "Evaluate"}
                        </button>
                        <button
                          onClick={() => {
                            const result =
                              document.getElementById("calc-result")
                                ?.innerText || "";
                            const exprInput = document.getElementById(
                              "calc-expression",
                            ) as HTMLInputElement;
                            const expr = exprInput ? exprInput.value : "";
                            if (
                              !result ||
                              result.includes("Error") ||
                              result.includes("خطأ")
                            )
                              return;

                            // Insert as text element onto the board!
                            const newElement: DrawElement = {
                              id: `text-${Date.now()}`,
                              type: "text",
                              x1: 200 + Math.random() * 80,
                              y1: 180 + Math.random() * 80,
                              color: brushColor,
                              width: brushWidth,
                              text: `${expr} = ${result}`,
                            };
                            const newElements = [...elements, newElement];
                            setElements(newElements);
                            updateHistory(newElements);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <Plus size={14} />
                          {language === "ar" ? "إدراج بالسبورة" : "Insert Text"}
                        </button>
                      </div>
                      <div className="bg-white/80 border border-indigo-100 rounded-xl px-3 py-2 flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 font-bold">
                          {language === "ar" ? "الناتج:" : "Result:"}
                        </span>
                        <span
                          id="calc-result"
                          className="text-sm font-mono font-black text-slate-800"
                        >
                          78.53975
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Curated Geometric & Math Reference Laws */}
                  <div className="flex-1 flex flex-col gap-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                      {language === "ar"
                        ? "دليل القوانين الهندسية الفاخر"
                        : "Premium Interactive Formula Sheets"}
                    </span>

                    {/* Pythagoras Law Card */}
                    <div className="border border-slate-200/70 rounded-2xl p-3 bg-white hover:border-indigo-300 transition-colors group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800">
                          {language === "ar"
                            ? "قانون فيثاغورس (Pythagorean Theorem)"
                            : "Pythagorean Theorem"}
                        </span>
                        <button
                          onClick={() => {
                            const textVal =
                              language === "ar"
                                ? "قانون فيثاغورس: a² + b² = c²"
                                : "Pythagorean Law: a² + b² = c²";
                            const newElement: DrawElement = {
                              id: `text-${Date.now()}`,
                              type: "text",
                              x1: 150 + Math.random() * 50,
                              y1: 150 + Math.random() * 50,
                              color: "#4f46e5",
                              width: 5,
                              text: textVal,
                            };
                            const newElements = [...elements, newElement];
                            setElements(newElements);
                            updateHistory(newElements);
                          }}
                          className="text-[9px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-indigo-600 hover:text-white"
                        >
                          {language === "ar"
                            ? "إدراج القانون"
                            : "Insert Formula"}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                        {language === "ar"
                          ? "مربع طول الوتر يساوي مجموع مربعي طولي الضلعين الآخرين في المثلث القائم الزاوية."
                          : "In a right-angled triangle, the square of the hypotenuse is equal to the sum of the squares of the other two sides."}
                      </p>
                      <div className="mt-1.5 text-xs font-mono font-bold text-indigo-600 bg-indigo-50/40 rounded px-2 py-0.5 inline-block">
                        a² + b² = c²
                      </div>
                    </div>

                    {/* Circle Formula Card */}
                    <div className="border border-slate-200/70 rounded-2xl p-3 bg-white hover:border-indigo-300 transition-colors group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800">
                          {language === "ar"
                            ? "مساحة ومحيط الدائرة (Circle Laws)"
                            : "Circle Area & Circumference"}
                        </span>
                        <button
                          onClick={() => {
                            const textVal =
                              language === "ar"
                                ? "مساحة الدائرة: A = πr² | المحيط: C = 2πr"
                                : "Circle: Area = πr² | Circumference = 2πr";
                            const newElement: DrawElement = {
                              id: `text-${Date.now()}`,
                              type: "text",
                              x1: 150 + Math.random() * 50,
                              y1: 150 + Math.random() * 50,
                              color: "#f43f5e",
                              width: 5,
                              text: textVal,
                            };
                            const newElements = [...elements, newElement];
                            setElements(newElements);
                            updateHistory(newElements);
                          }}
                          className="text-[9px] font-black bg-rose-50 text-rose-600 px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-rose-600 hover:text-white"
                        >
                          {language === "ar"
                            ? "إدراج القانون"
                            : "Insert Formula"}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                        {language === "ar"
                          ? "المساحة تساوي نسبة ط (π) مضروبة في مربع نصف القطر r."
                          : "Area measures space inside circle. Circumference measures perimeter."}
                      </p>
                      <div className="mt-1.5 flex gap-2">
                        <span className="text-[11px] font-mono font-bold text-rose-600 bg-rose-50/40 rounded px-2 py-0.5">
                          Area = π · r²
                        </span>
                        <span className="text-[11px] font-mono font-bold text-rose-600 bg-rose-50/40 rounded px-2 py-0.5">
                          Circumference = 2 · π · r
                        </span>
                      </div>
                    </div>

                    {/* Volume of 3D Sphere Card */}
                    <div className="border border-slate-200/70 rounded-2xl p-3 bg-white hover:border-indigo-300 transition-colors group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-800">
                          {language === "ar"
                            ? "حجم ومساحة الكرة (Sphere Laws)"
                            : "Sphere Volume & Surface Area"}
                        </span>
                        <button
                          onClick={() => {
                            const textVal =
                              language === "ar"
                                ? "حجم الكرة: V = 4/3 πr³ | مساحة السطح: A = 4πr²"
                                : "Sphere: Volume = 4/3 πr³ | Surface = 4πr²";
                            const newElement: DrawElement = {
                              id: `text-${Date.now()}`,
                              type: "text",
                              x1: 150 + Math.random() * 50,
                              y1: 150 + Math.random() * 50,
                              color: "#10b981",
                              width: 5,
                              text: textVal,
                            };
                            const newElements = [...elements, newElement];
                            setElements(newElements);
                            updateHistory(newElements);
                          }}
                          className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:bg-emerald-600 hover:text-white"
                        >
                          {language === "ar"
                            ? "إدراج القانون"
                            : "Insert Formula"}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                        {language === "ar"
                          ? "حساب السعة والحجم الداخلي للأشكال ثلاثية الأبعاد الدائرية."
                          : "Calculate volume and surface area of 3D spherical geometric elements."}
                      </p>
                      <div className="mt-1.5 flex gap-2">
                        <span className="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-50 rounded px-2 py-0.5">
                          V = 4/3 · π · r³
                        </span>
                        <span className="text-[11px] font-mono font-bold text-emerald-600 bg-emerald-50 rounded px-2 py-0.5">
                          Surface = 4 · π · r²
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex justify-center text-[10px] font-bold text-slate-400 shrink-0">
                  {language === "ar"
                    ? "نوفا بورد - مصادر تعليم مدمجة بالكامل"
                    : "NovaBoard Interactive Companion Engine"}
                </div>
              </div>
            )}

            {/* Restore Bottom Bar Button */}
            {!showBottomBar && (
              <button
                onClick={() => setShowBottomBar(true)}
                className="absolute bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 bg-white/95 border border-slate-200 hover:border-indigo-200 text-indigo-600 font-extrabold text-[11px] rounded-full px-4 py-2 shadow-2xl cursor-pointer hover:scale-105 transition-all z-30 flex items-center gap-1.5 animate-bounce"
                title={
                  language === "ar"
                    ? "إظهار شريط التحكم السفلي"
                    : "Show Bottom Bar"
                }
              >
                <span>📊</span>
                <span>
                  {language === "ar" ? "إظهار شريط التحكم" : "Show Bottom Bar"}
                </span>
              </button>
            )}

            {/* Floating Bottom Toolbar (Zoom, Grid) */}
            <div
              className={`absolute left-1/2 -translate-x-1/2 flex flex-wrap md:flex-nowrap items-center justify-center gap-1.5 sm:gap-4 bg-white/95 backdrop-blur-md border border-slate-200 px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-2xl shadow-xl z-30 transition-all duration-300 max-w-[95vw] md:max-w-max ${
                showBottomBar
                  ? "bottom-20 md:bottom-8 opacity-100"
                  : "bottom-[-150px] opacity-0 pointer-events-none"
              }`}
            >
              {/* Zoom controls */}
              <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                  onClick={() => setZoom(Math.max(50, zoom - 25))}
                  className="p-1 sm:p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer"
                >
                  <Minus size={14} className="sm:w-[18px] sm:h-[18px]" />
                </button>

                <span className="text-[10px] sm:text-xs font-bold text-slate-700 w-8 sm:w-10 text-center tabular-nums">
                  {zoom}%
                </span>

                <button
                  onClick={() => setZoom(Math.min(200, zoom + 25))}
                  className="p-1 sm:p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 cursor-pointer"
                >
                  <Plus size={14} className="sm:w-[18px] sm:h-[18px]" />
                </button>
              </div>

              <div className="hidden xs:block w-px h-4 bg-slate-200 mx-0.5 sm:mx-1"></div>

              {/* Grid Background Switcher */}
              <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200/50 scale-90 sm:scale-100 origin-center">
                <button
                  onClick={() => setGridType("dots")}
                  className={`px-1.5 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[11px] font-bold rounded-md transition-all ${gridType === "dots" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500"}`}
                >
                  {language === "ar" ? "نقاط" : "Dots"}
                </button>
                <button
                  onClick={() => setGridType("grid")}
                  className={`px-1.5 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[11px] font-bold rounded-md transition-all ${gridType === "grid" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500"}`}
                >
                  {language === "ar" ? "مربعات" : "Grid"}
                </button>
                <button
                  onClick={() => setGridType("lines")}
                  className={`px-1.5 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[11px] font-bold rounded-md transition-all ${gridType === "lines" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500"}`}
                >
                  {language === "ar" ? "أسطر" : "Lines"}
                </button>
                <button
                  onClick={() => setGridType("none")}
                  className={`px-1.5 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[11px] font-bold rounded-md transition-all ${gridType === "none" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500"}`}
                >
                  {language === "ar" ? "بيضاء" : "Blank"}
                </button>
              </div>

              {/* Grid Size Controller (Adjust size of grid dots/squares) */}
              {gridType !== "none" && (
                <>
                  <div className="hidden sm:block w-px h-4 bg-slate-200 mx-1"></div>
                  <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200 items-center gap-0.5 sm:gap-1 scale-90 sm:scale-100 origin-center">
                    <button
                      onClick={() => setGridSize(Math.max(12, gridSize - 4))}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-slate-500 hover:bg-white hover:text-indigo-600 transition-all font-bold text-xs cursor-pointer"
                      title={
                        language === "ar"
                          ? "تصغير حجم الشبكة"
                          : "Decrease grid spacing"
                      }
                    >
                      -
                    </button>
                    <span className="text-[9px] sm:text-[10px] font-mono font-bold text-slate-600 min-w-[24px] sm:min-w-[32px] text-center select-none">
                      {gridSize}px
                    </span>
                    <button
                      onClick={() => setGridSize(Math.min(64, gridSize + 4))}
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-slate-500 hover:bg-white hover:text-indigo-600 transition-all font-bold text-xs cursor-pointer"
                      title={
                        language === "ar"
                          ? "تكبير حجم الشبكة"
                          : "Increase grid spacing"
                      }
                    >
                      +
                    </button>
                  </div>
                </>
              )}

              <div className="w-px h-4 bg-slate-200 mx-0.5 sm:mx-1"></div>

              {/* Pages Control Bar */}
              <div className="flex items-center gap-1 sm:gap-1.5 p-0.5 sm:p-1 rounded-xl scale-90 sm:scale-100 origin-center">
                <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-500 px-1 sm:px-2 select-none hidden xs:inline-block">
                  {language === "ar" ? "الصفحات" : "Pages"}
                </span>

                {/* Previous page button */}
                <button
                  onClick={() => {
                    const currIdx = pages.findIndex(
                      (p) => p.id === currentPageId,
                    );
                    if (currIdx > 0) {
                      switchPage(pages[currIdx - 1].id);
                    }
                  }}
                  disabled={
                    pages.findIndex((p) => p.id === currentPageId) === 0
                  }
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                  title={language === "ar" ? "الصفحة السابقة" : "Previous page"}
                >
                  <ChevronRight
                    size={12}
                    className={language === "ar" ? "rotate-180" : ""}
                  />
                </button>

                {/* Pages dropdown selector */}
                <select
                  value={currentPageId}
                  onChange={(e) => switchPage(e.target.value)}
                  className="text-[10px] sm:text-xs font-bold text-slate-700 bg-white border border-slate-200/50 rounded-md px-1 sm:px-2 py-0.5 focus:outline-none cursor-pointer"
                >
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {/* Next page button */}
                <button
                  onClick={() => {
                    const currIdx = pages.findIndex(
                      (p) => p.id === currentPageId,
                    );
                    if (currIdx < pages.length - 1) {
                      switchPage(pages[currIdx + 1].id);
                    }
                  }}
                  disabled={
                    pages.findIndex((p) => p.id === currentPageId) ===
                    pages.length - 1
                  }
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                  title={language === "ar" ? "الصفحة التالية" : "Next page"}
                >
                  <ChevronRight
                    size={12}
                    className={language === "ar" ? "" : "rotate-180"}
                  />
                </button>

                {/* Add page button */}
                <button
                  onClick={addNewPage}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-all cursor-pointer"
                  title={
                    language === "ar" ? "إضافة صفحة جديدة" : "Add new page"
                  }
                >
                  <Plus size={12} />
                </button>

                {/* Delete active page button */}
                {pages.length > 1 && (
                  <button
                    onClick={() => deletePage(currentPageId)}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-md text-red-500 hover:bg-red-50 flex items-center justify-center transition-all cursor-pointer"
                    title={
                      language === "ar"
                        ? "حذف الصفحة الحالية"
                        : "Delete current page"
                    }
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              <div className="hidden xs:block w-px h-4 bg-slate-200 mx-0.5 sm:mx-1"></div>

              {/* Hide Bottom Bar Button */}
              <button
                onClick={() => setShowBottomBar(false)}
                className="p-1 sm:p-1.5 hover:bg-red-50 hover:text-red-600 rounded-lg text-slate-400 cursor-pointer transition-colors"
                title={
                  language === "ar"
                    ? "إخفاء شريط التحكم السفلي"
                    : "Hide Bottom Bar"
                }
              >
                <EyeOff size={14} className="sm:w-[18px] sm:h-[18px]" />
              </button>
            </div>
          </main>
        </div>
      )}
    </>
  );
}

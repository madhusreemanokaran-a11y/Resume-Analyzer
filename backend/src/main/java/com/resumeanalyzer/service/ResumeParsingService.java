package com.resumeanalyzer.service;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;

@Service
public class ResumeParsingService {

    public String extractText(MultipartFile file) throws IOException {
        String filename = file.getOriginalFilename();
        if (filename == null) {
            throw new IllegalArgumentException("File name missing");
        }
        String lower = filename.toLowerCase();
        try (InputStream is = file.getInputStream()) {
            if (lower.endsWith(".pdf")) {
                try (PDDocument document = PDDocument.load(is)) {
                    return new PDFTextStripper().getText(document);
                }
            } else if (lower.endsWith(".docx")) {
                try (XWPFDocument document = new XWPFDocument(is);
                     XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
                    return extractor.getText();
                }
            } else {
                throw new IllegalArgumentException("Unsupported file type. Please upload a PDF or DOCX file.");
            }
        }
    }
}

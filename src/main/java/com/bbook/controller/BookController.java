package com.bbook.controller;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import com.bbook.constant.ActivityType;
import com.bbook.entity.Book;
import com.bbook.service.BookDetailService;
import com.bbook.service.MemberService;
import com.bbook.service.MemberActivityService;

import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
@RequestMapping(value = "/item")
public class BookController {
	private final BookDetailService bookDetailService;
	private final MemberActivityService memberActivityService;
	private final MemberService memberService;

	@GetMapping
	public String getBook(@RequestParam(name = "bookId") Long id, Model model) {
		Book book = bookDetailService.getBookById(id);
		model.addAttribute("book", book);

		List<Book> authorBooks = new ArrayList<>(bookDetailService
				.getBooksByAuthor(book.getAuthor()).stream()
				.filter(b -> !b.getId().equals(id)).toList());

		Collections.shuffle(authorBooks);
		authorBooks = authorBooks.stream().limit(4).toList();

		model.addAttribute("authorBooks", authorBooks);

		Optional<String> memberEmail = memberService.getCurrentMemberEmail();
		if (memberEmail.isPresent()){
			memberActivityService.saveActivity(memberEmail.get(), book.getId(), ActivityType.VIEW);
		}

		return "items/itemDtl";
	}
}